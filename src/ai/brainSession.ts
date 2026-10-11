import { MODELS } from './models'
import type { Backend, ModelKey, Reply, Request } from './models'
import { updateProgress } from './downloadProgress'
import type { FileMap } from './downloadProgress'
export type BrainState = 'idle' | 'awaiting_confirmation' | 'downloading' | 'initializing' | 'ready' | 'failed' | 'cancelled'
type Result = Extract<Reply, { type: 'result' }>
export interface InferenceTransport {
  generationTimeoutMs?: number
  postMessage(request:Request):void; terminate():void
  onmessage:((event:MessageEvent<Reply>)=>void)|null
  onerror:((event:ErrorEvent)=>void)|null
  onmessageerror:((event:MessageEvent)=>void)|null
}
type Diagnostic = { ms: number; event: string; detail: string }
type Snapshot = { state: BrainState; generating: boolean; error: string; errorType: string; progress: FileMap; currentFile: string; model: ModelKey; backend: Backend; loadMs: number | null; diagnostics: Diagnostic[] }
export function classifyError(message: string) {
  if (/quota|storage.*full/i.test(message)) return 'storage-quota'
  if (/cache/i.test(message)) return 'cache'
  if (/out of memory|allocation|allocate|buffer.*size|device.*lost/i.test(message)) return 'memory-or-device'
  if (/network|fetch|download|http|connection/i.test(message)) return 'network'
  if (/unsupported|unavailable|shader-f16|web workers|webassembly/i.test(message)) return 'unsupported'
  if (/timed out/i.test(message)) return 'timeout'
  return 'initialization-or-runtime'
}
// Page-owned, not component-owned. Subscribing/unsubscribing never starts or stops it.
// Both Lab and Talk use this exact transport; no second inference owner exists.
export class BrainSession {
  private snapshot: Snapshot = { state: 'idle', generating: false, error: '', errorType: '', progress: {}, currentFile: '', model: 'qwen', backend: 'webgpu', loadMs: null, diagnostics: [] }
  private listeners = new Set<() => void>()
  private worker: InferenceTransport | null = null
  private epoch = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private pending: { resolve: (result: Result) => void; reject: (error: Error) => void; chunk?: (text: string) => void } | null = null
  private started = 0
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(patch: Partial<Snapshot>) { this.snapshot = { ...this.snapshot, ...patch }; this.listeners.forEach(listener => listener()) }
  private log(event: string, detail = '') {
    this.publish({ diagnostics: [...this.snapshot.diagnostics, { ms: Math.round(performance.now()), event, detail }].slice(-120) })
  }
  private transition(state: BrainState) { this.log('state', `${this.snapshot.state} -> ${state}`); this.publish({ state }) }
  confirm = () => {
    if (['idle', 'failed', 'cancelled'].includes(this.snapshot.state)) this.transition('awaiting_confirmation')
  }
  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = null }
  private deadline(ms: number) { this.clearTimer(); this.timer = setTimeout(() => this.fail('Operation timed out; model unloaded. Cached files may remain.', 'timeout'), ms) }
  private release(reason: string) {
    this.epoch++; this.clearTimer()
    if (this.worker) { this.worker.terminate(); this.worker = null; this.log('worker terminated', reason) }
    const pending = this.pending; this.pending = null; pending?.reject(new Error(reason))
    this.publish({ generating: false })
  }
  stop = (reason = 'Explicit cancel / unload') => { this.release(reason); this.publish({ error: '', errorType: '' }); this.transition('cancelled') }
  private fail(message: string, type = classifyError(message)) {
    this.release(message); this.publish({ error: message, errorType: type, loadMs: this.started ? performance.now() - this.started : null }); this.log('error', `${type}: ${message}`); this.transition('failed')
  }
  load = async (model: ModelKey, backend: Backend, support: () => Promise<string | null>, create: () => Promise<InferenceTransport>) => {
    // Synchronous reservation before any await prevents double clicks and simultaneous Lab loads.
    if (this.worker || ['downloading', 'initializing', 'ready'].includes(this.snapshot.state)) return false
    const ticket = ++this.epoch
    this.started = performance.now()
    this.publish({ model, backend, error: '', errorType: '', progress: {}, currentFile: '', loadMs: null })
    this.log('load requested', `${MODELS[model].repo}@${MODELS[model].revision}; ${backend}; ${backend === 'webgpu' ? 'q4f16' : 'q4'}`)
    this.transition('initializing'); this.deadline(600_000)
    try {
      const unsupported = await support()
      if (ticket !== this.epoch) return false
      if (unsupported) throw new Error(unsupported)
      this.log('cache', typeof caches === 'undefined' ? 'Cache API unavailable; downloads may repeat' : 'Cache API best effort; files retained on cancel/failure')
      const worker = await create()
      if (ticket !== this.epoch) { worker.terminate(); return false }
      this.worker = worker; this.log('worker created')
      worker.onerror = e => { if (this.worker === worker) this.fail(e.message || 'Model worker crashed.', 'worker-crash') }
      worker.onmessageerror = () => { if (this.worker === worker) this.fail('Model worker message could not be decoded.', 'worker-message') }
      worker.onmessage = (event: MessageEvent<Reply>) => {
        if (this.worker !== worker) return
        const reply = event.data
        if (reply.type === 'phase') { this.log('initialization', reply.stage); this.transition(reply.state) }
        if (reply.type === 'diagnostic') this.log(reply.event, reply.detail)
        if (reply.type === 'progress') {
          const old = this.snapshot.progress[reply.file]
          if (!old || old.status !== reply.status || (reply.status === 'progress' && reply.loaded < old.loaded)) this.log('file', `${reply.file}: ${reply.status}; ${reply.loaded}/${reply.total}${old && reply.loaded < old.loaded && reply.status === 'progress' ? ' (byte counter decreased)' : ''}`)
          this.publish({ progress: updateProgress(this.snapshot.progress, reply), currentFile: reply.file })
          if (reply.status !== 'done' && this.snapshot.state !== 'ready') this.publish({ state: 'downloading' })
        }
        if (reply.type === 'ready') { this.clearTimer(); this.publish({ loadMs: reply.loadMs }); this.log('ready', `${reply.loadMs.toFixed(0)} ms including warm-up`); this.transition('ready') }
        if (reply.type === 'chunk') this.pending?.chunk?.(reply.text) // Lab-only unchecked drafts; Talk never subscribes.
        if (reply.type === 'result' && this.pending) { const pending = this.pending; this.pending = null; this.clearTimer(); this.publish({ generating: false }); pending.resolve(reply) }
        if (reply.type === 'error') this.fail(reply.message, reply.errorType || classifyError(reply.message))
      }
      worker.postMessage({ type: 'load', model, backend } satisfies Request)
      return true
    } catch (error) { if (ticket === this.epoch) this.fail(error instanceof Error ? error.message : String(error)); return false }
  }
  generate = (request: Extract<Request, { type: 'generate' }>, chunk?: (text: string) => void): Promise<Result> => {
    if (!this.worker || this.snapshot.state !== 'ready' || this.pending || this.snapshot.generating) return Promise.reject(new Error('Wake tiny brain before AI chat; another operation may be running.'))
    this.publish({ generating: true }); this.deadline(this.worker.generationTimeoutMs ?? 180_000)
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject, chunk }
      try { this.worker!.postMessage(request) } catch (error) { this.fail(error instanceof Error ? error.message : String(error)) }
    })
  }
}
export const brainSession = new BrainSession()
