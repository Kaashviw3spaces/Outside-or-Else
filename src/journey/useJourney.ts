import { useEffect, useState } from 'react'
import { getJourneyData, resumeOuting } from './service'
import { storageMessage } from './database'
import type { JourneyData } from './types'
export function useJourney(petId:string) {
  const [data,setData]=useState<JourneyData>({active:null,manualDraft:null,memories:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0)
  useEffect(()=>{
    let alive=true,sequence=0
    async function refresh(){const request=++sequence;try{const next=await getJourneyData(petId);if(next.active?.status==='active')next.active=await resumeOuting(petId,next.active.id);if(alive&&request===sequence){setData(next);setError('')}}catch(e){if(alive&&request===sequence)setError(storageMessage(e))}finally{if(alive&&request===sequence)setLoading(false)}}
    const update=()=>void refresh(),visible=()=>{if(document.visibilityState==='visible')update()}
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('outside-or-else:journey'):null
    if(channel)channel.onmessage=update
    window.addEventListener('journey-changed',update);window.addEventListener('focus',update);document.addEventListener('visibilitychange',visible);void refresh()
    return ()=>{alive=false;channel?.close();window.removeEventListener('journey-changed',update);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',visible)}
  },[petId,revision])
  return {...data,loading,error,retry:()=>{setLoading(true);setRevision(v=>v+1)}}
}
