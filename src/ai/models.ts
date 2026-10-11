import type { GenerationConfiguration } from './generation'
import type { GroundedContext } from './grounding'
import type { Quality } from './quality'
// Artifact sizes/revisions verified against the public Hub API. Bytes exclude tokenizer/runtime.
export const MODELS = {
  qwen: { label: 'Qwen3-0.6B (preferred)', repo: 'onnx-community/Qwen3-0.6B-ONNX', revision: '1e0a4a196ecabdf9a879664110574563d3f372d3', gpuBytes: 569789750, cpuBytes: 919096585 },
  smol: { label: 'SmolLM2-135M (smaller feasibility test)', repo: 'HuggingFaceTB/SmolLM2-135M-Instruct', revision: '12fd25f77366fa6b3b4b768ec3050bf629380bac', gpuBytes: 117691126, cpuBytes: 182068553 },
} as const
export type ModelKey = keyof typeof MODELS
export type Backend = 'webgpu' | 'wasm'
// Conservative planning ranges, not measured peak allocations or device guarantees.
export const MEMORY_BUDGET_GIB = {
  qwen: { webgpu: '2–4', wasm: '3–6' },
  smol: { webgpu: '0.75–1.5', wasm: '1–2' },
} as const
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
export type Attempt = { text: string; generationMs: number; firstTokenMs: number | null; tokens: number; inputTokens: number; quality: Quality }
export type Request = { type: 'load'; model: ModelKey; backend: Backend } | { type: 'generate'; messages: ChatMessage[]; configuration?: GenerationConfiguration; context?: GroundedContext; purpose?: 'talk' }
export type Reply =
  | { type: 'progress'; file: string; loaded: number; total: number; status: string }
  | { type: 'ready'; loadMs: number }
  | { type: 'chunk'; text: string }
  | { type: 'result'; text: string; generationMs: number; firstTokenMs: number | null; tokens: number; tokensPerSecond: number; inputTokens: number; configuration: GenerationConfiguration; accepted?: boolean; attempts?: Attempt[]; retryReasons?: string[] }
  | { type: 'phase'; state: 'downloading' | 'initializing'; stage: string }
  | { type: 'diagnostic'; event: string; detail: string }
  | { type: 'error'; message: string; errorType?: string }
export const TEST_MESSAGES = ['hello', 'why do you hate my shoes?', 'i am tired today', 'i feel sad', 'do you love me?', 'where should we go?', 'what is a laptop?', 'do you remember our last adventure?', "i don't want to go outside", 'tell me something funny'] as const
