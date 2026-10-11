import type { Outing } from './types'
import { currentElapsedClock } from './clock'
import type { ElapsedClock } from './clock'
export function localDay(timestamp:number):string { const date=new Date(timestamp); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function rewardFor(outing:Pick<Outing,'kind'|'elapsedMs'|'plannedMinutes'>,hasPhoto:boolean,usedToday:number,affection:number) {
  const eligible=outing.kind==='outing' && outing.plannedMinutes!==null && outing.elapsedMs>=outing.plannedMinutes*60000
  const requested=outing.kind==='manual'?0:(eligible?2:0)+(hasPhoto?1:0)
  return {eligible,requested,awarded:Math.max(0,Math.min(requested,3-usedToday,100-affection))}
}
export function elapsed(outing:Pick<Outing,'startedAt'|'endedAt'> & Partial<Pick<Outing,'clock'|'elapsedMs'>>,now=Date.now(),reading:ElapsedClock=currentElapsedClock()):number {
  if(outing.clock){
    const saved=Math.max(0,outing.elapsedMs??0)
    if(outing.endedAt!==null||outing.clock.epoch!==reading.epoch)return saved
    return saved+Math.max(0,reading.ticks-outing.clock.ticks)
  }
  // Legacy display only. The service anchors active legacy records before returning them.
  return Math.max(0,(outing.endedAt??now)-outing.startedAt)
}
export function durationText(ms:number):string { const total=Math.floor(Math.max(0,ms)/1000);return `${Math.floor(total/60)}:${String(total%60).padStart(2,'0')}` }
