export interface ReminderPreferences {
  enabled:boolean; daily:boolean; checkIn:boolean; challenge:boolean; time:string
  quiet:boolean; quietStart:string; quietEnd:string
}
export const defaults:ReminderPreferences={enabled:false,daily:true,checkIn:true,challenge:true,time:'17:30',quiet:true,quietStart:'21:00',quietEnd:'08:00'}
export const reminderKey='outside-or-else:reminders:v1'
export const validTime=(v:unknown):v is string=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v)
export function readReminderPreferences():ReminderPreferences {
  try { const value=JSON.parse(localStorage.getItem(reminderKey)||'null'); if(!value)return {...defaults}
    const next={...defaults};for(const k of ['enabled','daily','checkIn','challenge','quiet'] as const)if(typeof value[k]==='boolean')next[k]=value[k]
    for(const k of ['time','quietStart','quietEnd'] as const)if(validTime(value[k]))next[k]=value[k]
    return next
  }catch{return {...defaults}}
}
export function saveReminderPreferences(p:ReminderPreferences) {
  try{localStorage.setItem(reminderKey,JSON.stringify(p));window.dispatchEvent(new Event('reminders-changed'));return true}catch{return false}
}
export function inQuietHours(time:string,p:ReminderPreferences) {
  if(!p.quiet)return false
  const n=(v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3)),t=n(time),a=n(p.quietStart),b=n(p.quietEnd)
  return a===b|| (a<b?t>=a&&t<b:t>=a||t<b)
}
