import { PetInference } from '../native/platform'
import type { Reply, Request, ChatMessage } from './models'
import { runValidatedGeneration } from './reliability'
import { talkFactIntent } from './talkFacts'
import type { InferenceTransport } from './brainSession'
// Adapts the native executor to the shared session lifecycle. No browser worker on Android.
export function createNativeTransport():InferenceTransport {
  let ended=false
  const emit=(data:Reply)=>{if(!ended)transport.onmessage?.({data} as MessageEvent<Reply>)}
  const transport:InferenceTransport={onmessage:null,onerror:null,onmessageerror:null,generationTimeoutMs:260_000,
    terminate(){ended=true;void PetInference.unload().catch(()=>{})},
    postMessage(request:Request){void (async()=>{
      if(request.type==='load'){
        if(request.model!=='qwen')throw new Error('The bundled companion brain is Qwen.')
        const result=await PetInference.initialize();emit({type:'ready',...result});return
      }
      if(!request.context)throw new Error('Read-only game context is required.')
      if(talkFactIntent(request.messages.at(-1)!.content))throw new Error('Saved facts must use the game-state answer.')
      const generate=(messages:ChatMessage[])=>PetInference.generate({messages,maxTokens:72})
      const controlled=await runValidatedGeneration(request.messages,request.context,generate)
      const last=controlled.attempts.at(-1)!,generationMs=controlled.attempts.reduce((n,a)=>n+a.generationMs,0),tokens=controlled.attempts.reduce((n,a)=>n+a.tokens,0)
      emit({type:'result',...last,...controlled,generationMs,tokens,tokensPerSecond:tokens/(generationMs/1000),configuration:'9b1-balanced'})
    })().catch(e=>emit({type:'error',message:e instanceof Error?e.message:String(e)}))},
  };return transport
}
