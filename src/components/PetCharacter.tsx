import { useId } from 'react'
import type { Mood, Reaction, Species } from '../types/game'
import { FURS, getBreed } from '../pets/catalog'
import type { PetDetails } from '../pets/save'
import { earPaths } from '../pets/shapes'
import { getPersonality } from '../pets/personality'
import type { CSSProperties } from 'react'
import { CoatRuff, FurMarkings, PetAccessory, TailShape } from './PetParts'
interface Props { species: Species; mood: Mood; affectionLevel: number; size: 'small' | 'medium' | 'large'; reaction?: Reaction; orange?: boolean; appearance?: PetDetails }
export function PetCharacter({ species, mood, affectionLevel, size, reaction = null, orange = false, appearance }: Props) {
  const id = useId().replace(/:/g, '')
  const cat = species === 'cat'
  const breed = getBreed(appearance?.breed, species), classic = breed.pattern === 'classic'
  const palette = FURS[appearance?.furVariation ?? (cat ? orange ? 'orange' : 'cream' : 'orange')]
  const fur = classic && !cat && (!appearance || appearance.furVariation === 'orange') ? '#edaf72' : classic && !appearance && cat ? orange ? '#eab37f' : '#f4ebda' : palette.color
  const stripe = classic && cat && !orange && (!appearance || appearance.furVariation === 'cream') ? '#aaa79c' : palette.dark
  const [leftEar,rightEar] = earPaths(breed.ears,cat)
  const ears = ['points','siamese'].includes(breed.pattern) ? stripe : fur
  const personality = getPersonality(appearance?.personality)
  const style = appearance ? { '--pet-idle-duration':`${personality.idleSeconds}s`, '--pet-blink-duration':`${personality.blinkSeconds}s` } as CSSProperties : undefined
  const head = breed.body === 'round' ? 'M73 110q0-40 77-34 77-6 77 34l6 35q0 60-83 61-83-1-83-61Z' : 'M75 106Q95 77 150 80q55-3 75 26l10 29-6 7 7 9-10 4q-4 49-76 51-71-2-76-51l-10-4 8-10-6-7Z'
  const iris = ['ragdoll','siamese','husky'].includes(breed.id) ? '#5684a8' : breed.id === 'russian-blue' ? '#557e55' : appearance?.furVariation === 'black' ? '#d1b57a' : '#594339'
  const smiling = mood === 'happy' || reaction === 'petting'
  const closed = smiling || mood === 'sleepy'
  return <svg style={style} data-breed={breed.id} data-fur={appearance?.furVariation} viewBox="0 0 300 300" role="img" aria-label={`${species}, ${reaction ?? mood}`} className={`pet-character pet-${size} mood-${mood} reaction-${reaction ?? 'none'} affection-${affectionLevel >= 60 ? 'warm' : 'shy'}`}>
    <defs><radialGradient id={`${id}-fur`} cx="40%" cy="25%" r="80%"><stop stopColor={classic && !appearance ? cat ? '#fff9ef' : '#ffd0a0' : palette.light} /><stop offset="1" stopColor={fur} /></radialGradient><clipPath id={`${id}-head`}><path d={head} /></clipPath><clipPath id={`${id}-body`}><ellipse cx="149" cy={breed.body === 'short' ? 224 : 209} rx={breed.body === 'round' ? 80 : breed.body === 'short' ? 78 : 70} ry={breed.body === 'short' ? 39 : 53} /></clipPath></defs>
    <ellipse cx="151" cy="264" rx="84" ry="13" fill="#76574b" opacity=".12" />
    <g className="pet-tail" stroke="#76574b" strokeWidth="3.5" strokeLinecap="round"><TailShape breed={breed} fur={fur} stripe={stripe} /></g>
    <g className="pet-body"><CoatRuff coat={breed.coat} fur={fur} body /><ellipse cx="149" cy={breed.body === 'short' ? 224 : 209} rx={breed.body === 'round' ? 80 : breed.body === 'short' ? 78 : 70} ry={breed.body === 'short' ? 39 : 53} fill={`url(#${id}-fur)`} stroke="#76574b" strokeWidth="3.5" /><g clipPath={`url(#${id}-body)`}><FurMarkings pattern={breed.pattern} part="body" color={stripe} cat={cat} /></g><ellipse cx="148" cy={breed.body === 'short' ? 234 : 224} rx="39" ry={breed.body === 'short' ? 20 : 30} fill="#fff6e7" />
      <g className="pet-paw"><ellipse cx="109" cy="253" rx="24" ry="12" fill={breed.pattern === 'siamese' ? stripe : breed.pattern === 'tuxedo' ? '#fff6e7' : fur} stroke="#76574b" strokeWidth="3" /><path d="M106 250v7m7-7v7" stroke="#ad8e7d" strokeWidth="2" /></g><ellipse cx="183" cy="253" rx="24" ry="12" fill={breed.pattern === 'siamese' ? stripe : breed.pattern === 'tuxedo' ? '#fff6e7' : fur} stroke="#76574b" strokeWidth="3" /><path d="M177 250v7m7-7v7" stroke="#ad8e7d" strokeWidth="2" /><PetAccessory accessory={appearance?.equippedAccessory} part="body" />
    </g>
    <g className="pet-head"><g transform={breed.body === 'short' ? 'translate(0 18)' : undefined}>
      <g className="pet-ear left-ear"><path data-ear-shape={breed.ears} d={leftEar} fill={ears} stroke="#76574b" strokeWidth="3.5" strokeLinejoin="round" />{breed.ears !== 'floppy' && <path d="m86 85 1-28 25 29" fill={cat ? '#e7b6b0' : '#c58969'} />}</g>
      <g className="pet-ear right-ear"><path d={rightEar} fill={ears} stroke="#76574b" strokeWidth="3.5" strokeLinejoin="round" />{breed.ears !== 'floppy' && <path d="m187 86 26-28 1 29" fill={cat ? '#e7b6b0' : '#c58969'} />}</g>
      <CoatRuff coat={breed.coat} fur={fur} /><path data-head-shape={breed.body} d={head} fill={`url(#${id}-fur)`} stroke="#76574b" strokeWidth="3.5" strokeLinejoin="round" /><g clipPath={`url(#${id}-head)`}><FurMarkings pattern={breed.pattern} part="head" color={stripe} cat={cat} /></g>
      {breed.ears === 'floppy' && <g className="floppy-ear-front" fill={breed.pattern === 'tricolor' ? '#ac754c' : fur} stroke="#76574b" strokeWidth="3.5"><g className="pet-ear left-ear"><path d={leftEar} /></g><g className="pet-ear right-ear"><path d={rightEar} /></g></g>}
      <g fill="#e6a3a0" opacity={smiling ? '.8' : '.48'}><ellipse cx="96" cy="157" rx="15" ry="8" /><ellipse cx="204" cy="157" rx="15" ry="8" /></g>
      <g className="pet-eyes" stroke="#594339" strokeWidth="4" strokeLinecap="round" fill="none">
        {closed ? <><path d={mood === 'sleepy' ? 'M104 140q8 6 16 0' : 'M103 142q9-12 18 0'} /><path d={mood === 'sleepy' ? 'M180 140q8 6 16 0' : 'M179 142q9-12 18 0'} /></> : mood === 'annoyed' ? <><path d="m103 136 18 4m59 0 18-4M111 143v4m78-4v4" /></> : <><ellipse cx="112" cy="139" rx={mood === 'excited' ? 9 : 7} ry="10" fill={iris} stroke="none" /><ellipse cx="188" cy="139" rx={mood === 'excited' ? 9 : 7} ry="10" fill={iris} stroke="none" /><g fill="#fff7ee" stroke="none"><circle cx="114" cy="136" r="2.5" /><circle cx="190" cy="136" r="2.5" /></g>{mood === 'sad' && <path d="m102 122 16-4m64 0 16 4" />}</>}
      </g>
      <path d="M143 156q7-4 14 0l-7 7Z" fill={cat ? '#bd8582' : '#594339'} stroke="#76574b" strokeWidth="2" strokeLinejoin="round" />
      <g className="pet-mouth" stroke="#76574b" strokeWidth="2.5" strokeLinecap="round" fill="none"><path d="M150 162v5m0 0q-7 9-14 0m14 0q7 9 14 0" />{mood === 'excited' && <path d="M140 171q10 20 20 0" fill="#d99593" />}</g>
      {cat && <g stroke="#a08777" strokeWidth="1.8" strokeLinecap="round"><path d="m96 166-26-4m27 11-23 4m130-11 26-4m-27 11 23 4" /></g>}
      <PetAccessory accessory={appearance?.equippedAccessory} part="head" />
    </g></g>
    {reaction === 'petting' && <g className="floating-heart" fill="#d98d88"><path d="M238 96c-22-14-12-32 0-20 12-12 22 6 0 20Z" /><path d="M60 125c-15-10-8-22 0-14 8-8 15 4 0 14Z" /></g>}
    {reaction === 'feeding' && <g className="food-bowl"><ellipse cx="151" cy="264" rx="36" ry="8" fill="#aa7759" /><path d="M112 264h78l-9 20h-59Z" fill="#a9d9e8" stroke="#76574b" strokeWidth="3" /><path d="M146 273h10" stroke="#fff4e6" strokeWidth="4" strokeLinecap="round" /></g>}
    {mood === 'sleepy' && <g className="sleep-z" fill="#76574b" fontFamily="serif" fontSize="20"><text x="227" y="105">z</text><text x="244" y="83" fontSize="27">z</text></g>}
  </svg>
}

