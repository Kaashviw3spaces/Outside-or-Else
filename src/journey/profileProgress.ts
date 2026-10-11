import type { Profile } from '../types/game'
import { normalizePet } from '../pets/save'
export function appliedRewards(profile:Profile):number {
  const value=profile.outdoor?.appliedRewardTotal
  return typeof value==='number'&&Number.isFinite(value)?Math.max(0,value):0
}
// Settings/wardrobe drafts must not roll back rewards, including session-only recovery.
export function preserveProgress(next:Profile,...sources:(Profile|null)[]):Profile {
  const candidates=[next,...sources.filter((p):p is Profile=>p?.id===next.id)]
  const pet=normalizePet(next),history=[...pet.relationshipHistory]
  for(const source of candidates)for(const event of normalizePet(source).relationshipHistory)if(!history.some(e=>e.id===event.id))history.push(event)
  const progress=candidates.filter(p=>p.outdoor).sort((a,b)=>appliedRewards(b)-appliedRewards(a))[0]?.outdoor
  return {...next,affection:Math.min(100,Math.max(...candidates.map(p=>p.affection))),outdoor:progress,pet:normalizePet({...next,pet:{...pet,relationshipHistory:history}})}
}
