import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useDialoguePhase } from '../dialogue/useDialoguePhase'
import { loadProfile } from '../lib/storage'
import { buildGroundedPrompt } from './prompt'
import type { PromptVariant } from './prompt'
import { readLabContext } from './readContext'
import { deterministicFacts, factualIntent } from './grounding'
import type { GenerationConfiguration } from './generation'
import { MEMORY_BUDGET_GIB, MODELS, TEST_MESSAGES } from './models'
import type { Backend, ModelKey, Reply } from './models'
import type { Profile } from '../types/game'
import './lab.css'
import { brainSession } from './brainSession'

type Status = 'idle' | 'loading' | 'ready' | 'generating' | 'error'
type Metrics = Extract<Reply, { type: 'result' }>
type GPU = { requestAdapter: (options?: {powerPreference:string}) => Promise<{ info?: { vendor: string; architecture: string; isFallbackAdapter?: boolean }; features: { has: (name: string) => boolean }; limits: { maxBufferSize: number; maxStorageBufferBindingSize: number } } | null> }
const demo: Profile = { id: 'unsaved-lab-example', species: 'cat', name: 'Miso', activities: [], outingTime: '17:00', duration: 5, affection: 10, sound: false, notifications: false }

export default function AILab() {
  const phase = useDialoguePhase()
  const [profile, setProfile] = useState(() => loadProfile())
  const [modelKey, setModelKey] = useState<ModelKey>(() => brainSession.getSnapshot().model)
  const [backend, setBackend] = useState<Backend>(() => brainSession.getSnapshot().backend)
  const brain = useSyncExternalStore(brainSession.subscribe, brainSession.getSnapshot, brainSession.getSnapshot)
  const status: Status = brain.generating ? 'generating' : brain.state === 'ready' ? 'ready' : ['downloading', 'initializing'].includes(brain.state) ? 'loading' : brain.state === 'failed' ? 'error' : 'idle'
  const [notice, setNotice] = useState('No inference runtime or model has been loaded.')
  const [localError, setError] = useState('')
  const error = brain.error || localError
  const [input, setInput] = useState<string>(TEST_MESSAGES[0])
  const [output, setOutput] = useState('')
  const loadMs = brain.loadMs
  const progress = brain.progress
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [facts, setFacts] = useState('')
  const [variant, setVariant] = useState<PromptVariant>('compact')
  const [configuration, setConfiguration] = useState<GenerationConfiguration>('9b1-balanced')
  const [diagnostics, setDiagnostics] = useState('Support is checked when you explicitly load a model.')
  const epoch = useRef(0)
  useEffect(() => () => { epoch.current++ }, []) // Invalidate UI work, retain page-owned initialization.
  const stop = (message: string) => { epoch.current++; brainSession.stop(message); setNotice(message) }
  async function load() {
    if (status === 'loading' || status === 'ready' || status === 'generating') return
    const ticket = epoch.current
    setError(''); setOutput(''); setFacts(''); setMetrics(null)
    await brainSession.load(modelKey, backend, async () => {
    try {
      if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') throw new Error('This browser needs Web Workers and WebAssembly for local inference.')
      const details = [`Secure context: ${isSecureContext}`, `Worker: supported`, `Backend: ${backend}`, `Browser: ${navigator.userAgent}`, `Cache API: ${typeof caches !== 'undefined' ? 'available (best effort; eviction possible)' : 'unavailable; downloads may repeat'}`, `Device RAM hint: ${Reflect.get(navigator, 'deviceMemory') ?? 'unavailable'} GB (not model memory)`]
      if (backend === 'webgpu') {
        const gpu = Reflect.get(navigator, 'gpu') as GPU | undefined
        if (!isSecureContext || !gpu) throw new Error('WebGPU unavailable. Android Wi-Fi HTTP is not a secure context. Use HTTPS or USB adb port forwarding to localhost. You can explicitly select WASM instead; it may be slow.')
        const adapter = await gpu.requestAdapter({powerPreference:'high-performance'})
        if (!adapter) throw new Error('Chrome could not provide a WebGPU adapter. Try the explicit WASM backend.')
        if (!adapter.features.has('shader-f16')) throw new Error('This GPU lacks shader-f16 required by q4f16. Select WASM q4 instead.')
        details.push(`GPU: ${adapter.info?.vendor || 'unspecified'} / ${adapter.info?.architecture || 'unspecified'}; fallback adapter: ${adapter.info?.isFallbackAdapter ?? 'unknown'}`)
        details.push(`GPU buffer limit: ${Math.round(adapter.limits.maxBufferSize / 1048576)} MiB; storage binding: ${Math.round(adapter.limits.maxStorageBufferBindingSize / 1048576)} MiB; shader-f16: yes`)
      }
      if (navigator.storage?.estimate) {
        const storage = await navigator.storage.estimate()
        details.push(`Origin storage: ${Math.round((storage.usage ?? 0) / 1048576)} / ${Math.round((storage.quota ?? 0) / 1048576)} MiB (shared origin, not free RAM)`)
      }
      if (ticket === epoch.current) setDiagnostics(details.join('\n')); setNotice('Downloading files / initializing model. First load can take several minutes.')
      return null
    } catch (cause) { return cause instanceof Error ? cause.message : String(cause) }
    }, async () => { const { createTalkWorker } = await import('./talkWorker'); return createTalkWorker() })
  }
  async function generate() {
    const intent = factualIntent(input)
    if ((!intent && status !== 'ready') || !input.trim() || status === 'loading' || status === 'generating') return
    const ticket = epoch.current
    setError(''); setOutput(''); setMetrics(null); setFacts(''); setNotice('Reading grounded game state…')
    const latestProfile = loadProfile()
    setProfile(latestProfile)
    const pet = latestProfile ?? demo
    try {
      const context = await readLabContext(pet, phase, input, !!latestProfile)
      if (ticket !== epoch.current) return
      if (intent) { setFacts(deterministicFacts(context, intent)); setNotice('Game-state facts only. No model generation or model loading occurred for this question.'); return }
      const reply = await brainSession.generate({ type: 'generate', messages: buildGroundedPrompt(pet, context, input, variant), context, configuration }, text => { if (ticket === epoch.current) setOutput(text) })
      if (ticket !== epoch.current) return
      setOutput(reply.text); setMetrics(reply); setNotice(reply.accepted === false ? 'QUALITY FAILURE: both actual model drafts rejected. No scripted fallback.' : 'Actual local generation completed; heuristic checks passed. Review accuracy, comfort and personality yourself.')
    } catch (cause) {
      if (ticket !== epoch.current) return
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }
  const busy = status === 'loading' || status === 'generating'
  const selected = MODELS[modelKey]
  const size = backend === 'webgpu' ? selected.gpuBytes : selected.cpuBytes
  return <main className="ai-lab">
    <a href="#">← Return to game</a>
    <h1>Local open-weight AI · experimental lab</h1>
    <p>This separate test does not change your pet, rewards or memories. In-room Talk now offers optional Qwen AI chat and labeled offline reactions. Model replies are raw, untrusted AI output and can invent facts despite grounding instructions.</p>
    <p>{profile ? `Read-only companion: ${profile.name} (${profile.species}).` : 'No saved pet: using a clearly unsaved example cat, Miso.'} Live Home mood is unavailable here; saved adventure state is read when generating.</p>
    <p>Loading sends model-file requests to Hugging Face and its download hosts; runtime files may use jsDelivr. Your prompt and game context stay on-device. No hosted inference, account, analytics or API key. Files use browser Cache API when available, never localStorage. Downloads are large; RAM use exceeds file size. No automatic GPU-to-CPU fallback.</p>
    <label>Model<select id="ai-model" value={modelKey} disabled={status === 'ready' || busy} onChange={e => setModelKey(e.target.value as ModelKey)}>{Object.entries(MODELS).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
    <label>Backend<select id="ai-backend" value={backend} disabled={status === 'ready' || busy} onChange={e => setBackend(e.target.value as Backend)}><option value="webgpu">WebGPU · q4f16</option><option value="wasm">WASM CPU · q4 · single thread</option></select></label>
    <p>Weights: approximately {(size / 1e6).toFixed(1)} MB, plus tokenizer and runtime. License: Apache-2.0. Repo: <a href={`https://huggingface.co/${selected.repo}`} target="_blank" rel="noreferrer">{selected.repo}</a></p>
    <p id="ai-memory-budget">Before loading: plan for approximately {MEMORY_BUDGET_GIB[modelKey][backend]} GiB of additional working memory{backend === 'webgpu' ? ' across RAM and GPU allocations' : ' in RAM'}, beyond the browser and game. This is a conservative planning estimate, not a measured peak or a guarantee; usage can exceed it. Loading also runs a one-token warm-up. Choose the smaller model for a first feasibility test and cancel if the device struggles.</p>
    <div className="ai-controls"><button id="ai-load" onClick={() => void load()} disabled={busy || status === 'ready'}>Load model explicitly</button><button id="ai-unload" onClick={() => stop('Cancelled / unloaded. Cached files may remain; game saves are unchanged.')}>Cancel / unload</button></div>
    <p role="status" data-ai-status={status}>{status === 'loading' ? `${brain.state}: reading files / initializing; closing this view keeps the session alive.` : status === 'ready' && notice.startsWith('Downloading') ? 'Ready. Inference stays on this device.' : notice}</p>
    {error && <p role="alert">{error}</p>}
    <ul aria-label="Model file progress">{Object.entries(progress).map(([file, value]) => <li key={file}>{file}: {value.status} {value.total > 0 ? `${Math.min(100, value.loaded / value.total * 100).toFixed(0)}% · ${(value.loaded / 1e6).toFixed(1)} / ${(value.total / 1e6).toFixed(1)} MB` : ''}</li>)}</ul>
    <label>Test message<textarea id="ai-input" maxLength={500} value={input} onChange={e => setInput(e.target.value)} /></label>
    <label>Prompt experiment<select id="ai-prompt-variant" value={variant} disabled={busy} onChange={e => setVariant(e.target.value as PromptVariant)}>{(['none', 'one', 'two', 'compact', 'persona'] as const).map(v => <option key={v}>{v}</option>)}</select></label>
    <label>Generation settings<select id="ai-configuration" value={configuration} disabled={busy} onChange={e => setConfiguration(e.target.value as GenerationConfiguration)}><option>9b1-balanced</option><option>9b1-restrained</option></select></label>
    <div className="ai-controls">{TEST_MESSAGES.map(message => <button key={message} onClick={() => setInput(message)}>{message}</button>)}</div>
    <button id="ai-generate" disabled={busy || (!factualIntent(input) && status !== 'ready') || !input.trim()} onClick={() => void generate()}>{factualIntent(input) ? 'Read game-state facts (no AI)' : 'Generate real local response'}</button>
    {facts && <section><h2>Game-state facts · deterministic, not AI dialogue</h2><pre id="ai-facts">{facts}</pre></section>}
    <h2>Real local AI response</h2>
    <p>Streamed text is an unchecked draft. At most one retry; rejected drafts and reasons appear in metrics. A quality failure is not a successful reply. Heuristics can miss hallucinations or reject harmless text.</p>
    <pre id="ai-output" aria-live="polite">{output || 'No model response yet.'}</pre>
    <h2>Diagnostics</h2><pre id="ai-diagnostics">{diagnostics + '\n' + JSON.stringify({model:MODELS[brain.model].repo,revision:MODELS[brain.model].revision,backend:brain.backend,quantization:brain.backend==='webgpu'?'q4f16':'q4',state:brain.state,errorType:brain.errorType,events:brain.diagnostics},null,2)}</pre>
    <p id="ai-load-time">Load including one-token warm-up: {loadMs === null ? 'not measured' : `${(loadMs / 1000).toFixed(2)} s`}. Reload timing may use cached files; a cold test needs a clean browser profile.</p>
    {metrics && <pre id="ai-metrics">{JSON.stringify(metrics, null, 2)}</pre>}
    {metrics?.attempts?.some(a => a.tokens >= (metrics.configuration === '9b1-restrained' ? 64 : 72)) && <p>A draft reached its output limit; it may be incomplete.</p>}
    <p>Tokens/s includes prompt prefill, not decode-only speed. Generation limit: 72 tokens balanced / 64 restrained per attempt; at most two attempts. Metrics include both attempts and their rejection reasons. Context limit: 1,024 input tokens. Total native/GPU model memory is not measurable reliably with standard browser APIs. Cancel terminates the worker; browser memory reclamation may be delayed. Closing this view or backgrounding retains the page-owned model. Cancel / unload explicitly to release memory; closing or reloading the browser page also ends the session. Cache eviction/offline reloads are browser-dependent.</p>
    <p>Test on your physical Android with HTTPS or <code>adb reverse tcp:5173 tcp:5173</code>, then open <code>http://localhost:5173/#ai-lab</code>. Desktop and emulated phone results do not prove Android compatibility.</p>
  </main>
}
