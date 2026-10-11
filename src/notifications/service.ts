import type { Profile } from '../types/game'
import type { ChallengeState } from '../challenge/rules'
import { day, ordinal } from '../challenge/rules'
import { isAndroid, PetReminders } from '../native/platform'
import { readReminderPreferences } from './preferences'
import { getJourneyData } from '../journey/service'
export function warningEligible(s:ChallengeState|null,petId:string,now=Date.now()) {
  if(!s||s.currentPetId!==petId||!s.enabled||s.paused||s.separatedAt!==null||s.safetyReason||s.timezone!==Intl.DateTimeFormat().resolvedOptions().timeZone)return false
  const today=ordinal(day(now)),base=Math.max(ordinal(s.graceDate),s.lastQualifyingDate?ordinal(s.lastQualifyingDate):-Infinity)
  return today-base===2 // One full missed day; current day can still qualify.
}
let queue=Promise.resolve()
export function syncReminders(profile:Profile|null,challenge:ChallengeState|null) {
  if(!isAndroid())return Promise.resolve({permission:'unsupported' as const,scheduled:0})
  const run=async()=>{
    const prefs=readReminderPreferences()
    let completedToday=false
    if(profile){try{const data=await getJourneyData(profile.id);completedToday=data.memories.some(m=>m.kind==='outing'&&m.status==='completed'&&!m.memoryDeleted&&day(m.completedAt??m.endedAt??0)===day(Date.now()))}catch(error){await PetReminders.sync({snapshot:JSON.stringify({prefs,petId:null})});throw error}}
    return PetReminders.sync({snapshot:JSON.stringify({prefs,petId:profile?.id??null,name:profile?.name??'',species:profile?.species??'cat',personality:profile?.pet?.personality??'shy',challenge,completedToday,date:day(Date.now()),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})})
  }
  const result=queue.then(run,run);queue=result.then(()=>{},()=>{});return result
}
