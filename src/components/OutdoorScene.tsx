import { useId } from 'react'
import type { Profile } from '../types/game'
import type { Outing } from '../journey/types'
import { PetCharacter } from './PetCharacter'
import { SkyLights } from './SkyLights'
import { PetLine } from './PetLine'
export function OutdoorScene({profile,outing,justStarted=false}:{profile:Profile;outing:Outing;justStarted?:boolean}) {
  const id=useId().replace(/:/g,'')
  return <div className="outdoor-scene"><svg className="outdoor-art" viewBox="0 0 440 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="var(--sky-top)" /><stop offset="1" stopColor="var(--sky-bottom)" /></linearGradient></defs><rect width="440" height="330" fill={`url(#${id}-sky)`} /><SkyLights x={335} y={61} radius={27} stars={[[50,35],[95,85],[230,29],[380,125]]} /><path d="M0 181Q90 92 185 166q131-84 255-20v184H0Z" fill="var(--hill-back)" /><path d="M0 212q117-53 232-5 125-48 208 8v115H0Z" fill="var(--hill-front)" /><path d="M86 330q56-71 203-101" fill="none" stroke="var(--path)" strokeWidth="68" /><path d="M45 237v-73m-21 0q-12-35 20-51 37 13 23 51-15 18-43 0" fill="var(--tree)" stroke="var(--tree)" strokeWidth="4" /><path d="M392 256v-62m-19 0q-8-33 18-43 34 12 22 43-16 16-40 0" fill="var(--tree)" stroke="var(--tree)" strokeWidth="4" /></svg><p className="outdoor-speech"><span>{outing.pet.name}: </span><PetLine species={outing.pet.species} personality={outing.pet.appearance.personality} event={outing.status === 'active' ? justStarted ? 'adventure_start' : 'adventure_active' : outing.elapsedMs < (outing.plannedMinutes ?? 0) * 60000 ? 'adventure_early_return' : 'adventure_return'} context={outing.id} /></p><div className="outdoor-pet"><PetCharacter species={outing.pet.species} appearance={profile.id===outing.pet.id?profile.pet:outing.pet.appearance} mood={outing.status==='active'?'idle':'happy'} affectionLevel={profile.affection} size="large" /></div></div>
}
