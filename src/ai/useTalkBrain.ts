import { useSyncExternalStore } from 'react'
import type { Backend, ChatMessage } from './models'
import type { GroundedContext } from './grounding'
import { brainSession } from './brainSession'
import { isAndroid } from '../native/platform'
type GPU = { requestAdapter: (options?: {powerPreference:string}) => Promise<{ features:{has:(name:string)=>boolean}; info?:{vendor:string;architecture:string} } | null> }
export async function inspectChatSupport() {
  if(isAndroid())return {gpu:false,cpu:true,detail:'Your companion’s brain is included in this app. It works without internet.'}
  const cpu = typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined'
  if (!cpu) return { gpu:false, cpu:false, detail:'This browser lacks Web Workers or WebAssembly.' }
  const gpu = Reflect.get(navigator,'gpu') as GPU | undefined
  if (!globalThis.isSecureContext || !gpu) return { gpu:false, cpu, detail:'WebGPU unavailable here. CPU mode is an explicit, slower option. GPU needs HTTPS or localhost.' }
  try {
    const adapter = await gpu.requestAdapter({powerPreference:'high-performance'})
    return { gpu:!!adapter?.features.has('shader-f16'), cpu, detail:adapter?.features.has('shader-f16') ? `WebGPU available: ${adapter.info?.vendor || 'GPU'} ${adapter.info?.architecture || ''}. This probe is not a memory guarantee.` : 'No suitable shader-f16 WebGPU adapter. CPU mode may be slow.' }
  } catch { return {gpu:false,cpu,detail:'WebGPU check failed. CPU mode may be slow.'} }
}
export function useTalkBrain(enabled: boolean) {
  const snapshot = useSyncExternalStore(brainSession.subscribe, brainSession.getSnapshot, brainSession.getSnapshot)
  const load = (backend:Backend)=>loadTalkBrain(enabled,backend)
  return { ...snapshot,
    status: snapshot.generating ? 'generating' : snapshot.state === 'failed' ? 'error' : ['downloading', 'initializing'].includes(snapshot.state) ? 'loading' : snapshot.state === 'ready' ? 'ready' : 'idle',
    load, confirm: brainSession.confirm, stop: brainSession.stop,
    generate: (messages: ChatMessage[], context: GroundedContext) => snapshot.model !== 'qwen' ? Promise.reject(new Error('Unload the different AI Lab model before waking Qwen.')) : brainSession.generate({ type: 'generate', purpose: 'talk', messages, context, configuration: '9b1-balanced' }),
  }
}
export async function loadTalkBrain(enabled:boolean,backend:Backend) {
    if (!enabled) return
    if(isAndroid()){await brainSession.load('qwen','wasm',async()=>null,async()=>{const {createNativeTransport}=await import('./nativeTransport');return createNativeTransport()});return}
    await brainSession.load('qwen', backend, async () => {
      const support = await inspectChatSupport()
      return (backend === 'webgpu' ? support.gpu : support.cpu) ? null : support.detail
    }, async () => { const { createTalkWorker } = await import('./talkWorker'); return createTalkWorker() })
}
