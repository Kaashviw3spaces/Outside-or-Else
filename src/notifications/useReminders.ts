import { useEffect } from 'react'
import type { Profile } from '../types/game'
import type { ChallengeState } from '../challenge/rules'
import { syncReminders } from './service'
export function useReminders(profile:Profile|null,challenge:ChallengeState|null,protectedState:boolean) {
  useEffect(()=>{
    const refresh=()=>{void syncReminders(protectedState?null:profile,protectedState?null:challenge).then(()=>{window.dispatchEvent(new Event('reminders-synced'))}).catch(()=>{window.dispatchEvent(new Event('reminders-error'))})}
    const visible=()=>{if(document.visibilityState==='visible')refresh()}
    refresh();window.addEventListener('journey-changed',refresh);window.addEventListener('reminders-changed',refresh);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',visible)
    return()=>{window.removeEventListener('journey-changed',refresh);window.removeEventListener('reminders-changed',refresh);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',visible)}
  },[profile,challenge,protectedState])
}
