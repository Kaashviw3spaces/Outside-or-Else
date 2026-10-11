import { AutoTokenizer, AutoModelForCausalLM, TextStreamer, env } from '@huggingface/transformers'
import type { PreTrainedModel, PreTrainedTokenizer } from '@huggingface/transformers'
import { MODELS } from './models'
import { GENERATION_SETTINGS } from './generation'
import type { Request, Reply } from './models'
import { runValidatedGeneration } from './reliability'
import { factualIntent } from './grounding'
import { talkFactIntent } from './talkFacts'
import { classifyError } from './brainSession'

env.allowLocalModels = false
env.useBrowserCache = typeof caches !== 'undefined'
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1 // No cross-origin isolation requirement on mobile.
  env.backends.onnx.wasm.proxy = false // This code is already in a worker.
}
let tokenizer: PreTrainedTokenizer | null = null
let model: PreTrainedModel | null = null
let busy = false
const send = (reply: Reply) => self.postMessage(reply)
// Transformers.js treats browser cache writes as best effort and warns instead of throwing.
// Capture only that technical warning, never arbitrary console content or prompt text.
const originalWarn = console.warn.bind(console)
console.warn = (...args: unknown[]) => {
  const message = args.filter((arg): arg is string => typeof arg === 'string').join(' ')
  if (/Unable to add response to browser cache|error occurred while opening the browser cache/i.test(message)) send({ type: 'diagnostic', event: 'cache warning', detail: message + args.filter((arg): arg is Error => arg instanceof Error).map(e => ` ${e.name}: ${e.message}`).join('') })
  originalWarn(...args)
}

self.onmessage = async (event: MessageEvent<Request>) => {
  if (busy) { send({ type: 'error', message: 'Another model operation is still running.' }); return }
  busy = true
  try {
    const request = event.data
    if (request.type === 'load') {
      if (model || tokenizer) throw new Error('Unload the existing model worker before loading again.')
      if (!Object.hasOwn(MODELS, request.model) || !['webgpu', 'wasm'].includes(request.backend)) throw new Error('Unsupported model/backend.')
      const selected = MODELS[request.model]
      const start = performance.now()
      const lastProgress = new Map<string, number>()
      const progress_callback = (value: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (!value.file) return // Model-level callbacks are not downloadable files.
        if (value.status === 'progress' && (value.loaded ?? 0) !== value.total) {
          const now = performance.now()
          if (now - (lastProgress.get(value.file) ?? -Infinity) < 150) return
          lastProgress.set(value.file, now)
        }
        send({ type: 'progress', status: value.status, file: value.file, loaded: value.loaded ?? 0, total: value.total ?? 0 })
        if (value.status === 'done' && /\.onnx(?:_data)?$/.test(value.file)) send({ type: 'phase', state: 'initializing', stage: 'Creating inference session from completed weight file' })
      }
      send({ type: 'phase', state: 'downloading', stage: 'Reading tokenizer files (network or browser cache)' })
      tokenizer = await AutoTokenizer.from_pretrained(selected.repo, { revision: selected.revision, progress_callback })
      send({ type: 'phase', state: 'downloading', stage: 'Reading pinned model files (network or browser cache)' })
      model = await AutoModelForCausalLM.from_pretrained(selected.repo, { revision: selected.revision, device: request.backend, dtype: request.backend === 'webgpu' ? 'q4f16' : 'q4', progress_callback })
      send({ type: 'phase', state: 'initializing', stage: 'One-token warm-up' })
      // Include session creation and one real token of warm-up in load timing.
      await model.generate({ ...tokenizer('hello'), max_new_tokens: 1, do_sample: false })
      send({ type: 'ready', loadMs: performance.now() - start })
    } else if (request.type === 'generate') {
      if (!model || !tokenizer) throw new Error('Load a model first.')
      const configuration = request.configuration ?? '9b1-balanced'
      if (!Object.hasOwn(GENERATION_SETTINGS, configuration)) throw new Error('Unsupported generation configuration.')
      if (![2, 4, 6].includes(request.messages.length) || request.messages.some(m => typeof m.content !== 'string' || m.content.length > 6000)) throw new Error('Prompt exceeds experiment limits.')
      if (request.messages.some((m, i) => m.role !== (i === 0 ? 'system' : i % 2 ? 'user' : 'assistant'))) throw new Error('Invalid prompt role sequence.')
      if (configuration.startsWith('9b1-') && !request.context) throw new Error('Grounded context is required for Checkpoint 9B.1.')
      if (request.purpose === 'talk' && !request.context) throw new Error('Talk requires readonly grounded game context.')
      if (request.context && (request.purpose === 'talk' ? talkFactIntent(request.messages.at(-1)!.content) : factualIntent(request.messages.at(-1)!.content))) throw new Error('Factual question: use the labeled game-state panel, not model inference.')
      const generate = async (messages: typeof request.messages) => {
      // Qwen's template accepts enable_thinking; runtime forwards custom template
      // keys although the shared tokenizer option type only lists standard keys.
      const templateOptions = { tokenize: false as const, add_generation_prompt: true, enable_thinking: false }
      let bounded = messages
      let inputs = tokenizer!(tokenizer!.apply_chat_template(bounded, templateOptions) as string, { add_special_tokens: false })
      while (request.purpose === 'talk' && (inputs.input_ids.dims.at(-1) ?? 0) > 1024 && bounded.length > 2) {
        bounded = [bounded[0], ...bounded.slice(3)] // Drop oldest complete turn; retain facts and latest user.
        inputs = tokenizer!(tokenizer!.apply_chat_template(bounded, templateOptions) as string, { add_special_tokens: false })
      }
      const inputTokens = inputs.input_ids.dims.at(-1) ?? 0
      if (inputTokens > 1024) throw new Error('Prompt exceeds the 1,024-token context budget.')
      let text = '', tokens = 0, firstTokenMs: number | null = null
      const start = performance.now()
      const streamer = new TextStreamer(tokenizer!, { skip_prompt: true, skip_special_tokens: true,
        callback_function: chunk => { text += chunk; send({ type: 'chunk', text }) },
        token_callback_function: chunk => { tokens += chunk.length; firstTokenMs ??= performance.now() - start },
      })
      await model!.generate({ ...inputs, ...GENERATION_SETTINGS[configuration], streamer })
      const generationMs = performance.now() - start
      return { text, tokens, firstTokenMs, inputTokens, generationMs }
      }
      const controlled = request.context ? await runValidatedGeneration(request.messages, request.context, generate) : null
      const result = controlled ? controlled.attempts.at(-1)! : await generate(request.messages)
      if (!controlled && !result.text.trim()) throw new Error('The model returned no visible response. No scripted fallback was used.')
      const generationMs = controlled ? controlled.attempts.reduce((sum, a) => sum + a.generationMs, 0) : result.generationMs
      const tokens = controlled ? controlled.attempts.reduce((sum, a) => sum + a.tokens, 0) : result.tokens
      const firstTokenMs = controlled ? controlled.attempts[0].firstTokenMs : result.firstTokenMs
      send({ type: 'result', ...result, generationMs, tokens, firstTokenMs, tokensPerSecond: tokens / (generationMs / 1000), configuration, ...(controlled ?? {}) })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    send({ type: 'error', message, errorType: classifyError(message) })
  } finally { busy = false }
}
