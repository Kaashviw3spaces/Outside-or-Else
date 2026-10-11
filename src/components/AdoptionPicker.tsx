import type { Species } from '../types/game'
import { BREEDS, FURS, getBreed } from '../pets/catalog'
import type { FurId, PersonalityId } from '../pets/catalog'
import { PERSONALITIES } from '../pets/personality'
import { adoptPet } from '../pets/save'
import { CozyRoom } from './CozyRoom'
import { PetCharacter } from './PetCharacter'
export function FurPicker({breed,species,value,onChange}: {breed:string;species:Species;value:FurId;onChange:(fur:FurId)=>void}) {
  return <div className="fur-options" role="group" aria-label="Fur variation">{getBreed(breed,species).fur.map(fur=><button type="button" key={fur} aria-pressed={value===fur} aria-label={FURS[fur].name+' fur'} onClick={()=>onChange(fur)}><span style={{background:FURS[fur].color}} /><small>{FURS[fur].name}</small></button>)}</div>
}
export function PersonalityPicker({value,onChange}: {value:PersonalityId;onChange:(value:PersonalityId)=>void}) {
  return <div className="personality-options" role="group" aria-label="Companion personality">{(Object.keys(PERSONALITIES) as PersonalityId[]).map(id=><button type="button" key={id} aria-pressed={id===value} onClick={()=>onChange(id)}>{PERSONALITIES[id].name}</button>)}<p>{PERSONALITIES[value].description}</p></div>
}
export function AdoptionPicker({species,breed,fur,personality,onSpecies,onBreed,onFur}: {species:Species;breed:string;fur:FurId;personality:PersonalityId;onSpecies:(species:Species)=>void;onBreed:(breed:string)=>void;onFur:(fur:FurId)=>void}) {
  const selected=getBreed(breed,species)
  const appearance=adoptPet(species,breed,fur,personality,'preview','2000-01-01T00:00:00Z')
  return <div className="adoption-center"><p className="eyebrow">choose blob. ears included.</p><div className="companion-options adoption-species">{(['cat','dog'] as Species[]).map(s=><button type="button" className={`companion-card ${s===species?'selected':''}`} key={s} aria-pressed={species===s} onClick={()=>onSpecies(s)}>{s==='cat'?'Cat':'Dog'}</button>)}</div><div className="adoption-stage"><CozyRoom><div className="adoption-preview" key={breed}><PetCharacter species={species} appearance={appearance} mood="idle" affectionLevel={10} size="large" /></div></CozyRoom></div><div className="adoption-breed-heading"><strong>{selected.name}</strong><p>{selected.description}</p></div><div className="breed-options" role="group" aria-label="Available breeds">{BREEDS.filter(b=>b.species===species).map(b=><button type="button" data-select-breed={b.id} aria-pressed={b.id===breed} key={b.id} onClick={()=>onBreed(b.id)}>{b.name}</button>)}</div><FurPicker breed={breed} species={species} value={fur} onChange={onFur} /></div>
}
