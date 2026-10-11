export interface ChallengeState {
  enabled:boolean; paused:boolean; currentPetId:string; generation:number; graceDate:string
  lastQualifyingDate:string|null; missedDayStreak:number; lastEvaluationDate:string
  lastEvaluationAt:number; timezone:string; separatedAt:number|null; safetyReason:string|null
  observation:{wall:number;mono:number;session:string}|null
}
export interface Clock { now:number; timezone:string; mono:number; session:string }
export function day(now:number):string {const d=new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function ordinal(value:string):number {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Challenge date data is invalid. Your companion is protected.')
  const n=Date.parse(value+'T00:00:00Z');if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw new Error('Challenge date data is invalid. Your companion is protected.')
  return n/86400000
}
export function initialState(id:string,generation:number,clock:Clock):ChallengeState {return {enabled:false,paused:false,currentPetId:id,generation,graceDate:day(clock.now),lastQualifyingDate:null,missedDayStreak:0,lastEvaluationDate:day(clock.now),lastEvaluationAt:clock.now,timezone:clock.timezone,separatedAt:null,safetyReason:null,observation:{wall:clock.now,mono:clock.mono,session:clock.session}}}
export function validateState(value:unknown):ChallengeState {
  if(!value||typeof value!=='object')throw new Error('Challenge data could not be loaded. Your companion is protected.')
  const s=value as ChallengeState
  if(typeof s.enabled!=='boolean'||typeof s.paused!=='boolean'||typeof s.currentPetId!=='string'||!Number.isInteger(s.generation)||s.generation<1||!Number.isInteger(s.missedDayStreak)||s.missedDayStreak<0||!Number.isFinite(s.lastEvaluationAt)||typeof s.timezone!=='string'||!(s.separatedAt===null||Number.isFinite(s.separatedAt))||!(s.lastQualifyingDate===null||typeof s.lastQualifyingDate==='string'))throw new Error('Challenge data is damaged. Your companion is protected.')
  ordinal(s.graceDate);ordinal(s.lastEvaluationDate);if(s.lastQualifyingDate)ordinal(s.lastQualifyingDate)
  if(s.observation&&(!Number.isFinite(s.observation.wall)||!Number.isFinite(s.observation.mono)||typeof s.observation.session!=='string'))throw new Error('Challenge clock data is damaged. Your companion is protected.')
  return s
}
export function evaluateDays(state:ChallengeState,clock:Clock,qualifyingDate:string|null):ChallengeState {
  validateState(state)
  if(!Number.isFinite(clock.now))throw new Error('The device clock is invalid. Your companion is protected.')
  if(state.separatedAt!==null||!state.enabled||state.paused)return state
  const today=day(clock.now),observed={wall:clock.now,mono:clock.mono,session:clock.session}
  const previous=state.observation
  const drift=previous?.session===clock.session?Math.abs((clock.now-previous.wall)-(clock.mono-previous.mono)):0
  if(clock.now<state.lastEvaluationAt||drift>300000)return {...state,paused:true,missedDayStreak:0,safetyReason:'The device clock changed. The challenge is paused; resume when the clock is correct.',observation:observed}
  if(clock.timezone!==state.timezone)return {...state,graceDate:today,missedDayStreak:0,lastEvaluationDate:today,lastEvaluationAt:clock.now,timezone:clock.timezone,safetyReason:'Local timezone changed. Today is a fresh grace day.',observation:observed}
  if(ordinal(today)<ordinal(state.lastEvaluationDate))return {...state,paused:true,missedDayStreak:0,safetyReason:'The local date moved backwards. The challenge is paused.',observation:observed}
  let last=state.lastQualifyingDate
  if(qualifyingDate&&(!last||ordinal(qualifyingDate)>ordinal(last)))last=qualifyingDate
  const baseline=Math.max(ordinal(state.graceDate),last?ordinal(last):-Infinity)
  const missed=Math.max(0,Math.min(2,ordinal(today)-baseline-1))
  return {...state,lastQualifyingDate:last,missedDayStreak:missed,lastEvaluationDate:today,lastEvaluationAt:clock.now,timezone:clock.timezone,observation:observed,safetyReason:null,separatedAt:missed>=2?clock.now:null}
}
