import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../types/game'
import { saveProfile } from '../lib/storage'
import { storageMessage } from '../journey/database'
import { configureChallenge, currentCompanion, evaluateChallenge, legacyPets, protectRecovered } from './service'
import type { ChallengeState } from './rules'
import type { Legacy } from './service'
export function useChallengeState(profile:Profile|null,onRecovered:(p:Profile,saved:boolean)=>void,onFarewell:()=>void){
  const [state,setState]=useState<ChallengeState|null>(null),[legacy,setLegacy]=useState<Legacy[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  const shown=useRef(new Set<string>())
  useEffect(()=>{
    let alive=true,sequence=0
    async function refresh(){const request=++sequence;try{
      const canonical=await currentCompanion()
      if(canonical&&canonical.id!==profile?.id){if(!profile){try{await protectRecovered(canonical)}catch(e){if(alive)setError(storageMessage(e))}}if(alive){setState(null);onRecovered(canonical,saveProfile(canonical))}return}
      if(!profile)return
      const next=await evaluateChallenge(profile),previous=await legacyPets()
      if(alive&&request===sequence){if(next.separatedAt!==null&&!shown.current.has(next.currentPetId)){shown.current.add(next.currentPetId);onFarewell()}setState(next);setLegacy(previous);setError('')}
    }catch(e){if(alive&&request===sequence)setError(storageMessage(e))}finally{if(alive&&request===sequence)setLoading(false)}}
    const update=()=>void refresh(),visible=()=>{if(document.visibilityState==='visible')update()}
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('outside-or-else:challenge'):null;if(channel)channel.onmessage=update
    const timer=setInterval(update,60000)
    window.addEventListener('challenge-changed',update);window.addEventListener('journey-changed',update);window.addEventListener('focus',update);document.addEventListener('visibilitychange',visible);void refresh()
    return ()=>{alive=false;clearInterval(timer);channel?.close();window.removeEventListener('challenge-changed',update);window.removeEventListener('journey-changed',update);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',visible)}
  },[profile,onRecovered,onFarewell,revision])
  async function configure(action:'enable'|'disable'|'pause'|'resume'){if(!profile)return;setLoading(true);try{const next=await configureChallenge(profile,action);setState(next);setError('')}catch(e){setError(storageMessage(e));throw e}finally{setLoading(false)}}
  return {state,legacy,loading,error,configure,refresh:()=>setRevision(v=>v+1)}
}
