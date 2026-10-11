import { PetLine } from '../components/PetLine'
import { useState } from 'react'
import type { Profile, Species } from '../types/game'
import type { FurId, PersonalityId } from '../pets/catalog'
import { getBreed } from '../pets/catalog'
import { normalizePet } from '../pets/save'
import { CozyRoom } from '../components/CozyRoom'
import { PetCharacter } from '../components/PetCharacter'
import { PetSpeechBubble } from '../components/PetSpeechBubble'
import { AdoptionPicker, PersonalityPicker } from '../components/AdoptionPicker'
import { readopt } from '../challenge/service'
import { storageMessage } from '../journey/database'
export function Farewell({profile,onMemories,onAdventure}:{profile:Profile;onMemories:()=>void;onAdventure:()=>void}){
  const [adopting,setAdopting]=useState(false),[species,setSpecies]=useState<Species>('cat'),[breed,setBreed]=useState('orange-tabby'),[fur,setFur]=useState<FurId>('orange'),[personality,setPersonality]=useState<PersonalityId>('playful'),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const pet=normalizePet(profile)
  if(adopting)return <section className="page-content readoption-screen"><span className="eyebrow">GENERATION {pet.generation+1}</span><h1>choose next tiny friend.</h1><p><PetLine species={species} personality={personality} event="readoption" /></p><AdoptionPicker species={species} breed={breed} fur={fur} personality={personality} onSpecies={s=>{setSpecies(s);setBreed(s==='cat'?'orange-tabby':'shiba-inu');setFur('orange')}} onBreed={id=>{setBreed(id);setFur(getBreed(id,species).fur[0])}} onFur={setFur} /><label htmlFor="new-companion-name">Your new companion's name</label><input id="new-companion-name" maxLength={24} value={name} onChange={e=>setName(e.target.value)} /><PersonalityPicker value={personality} onChange={setPersonality} /><button type="button" className="primary-button adopt-again" disabled={busy||!name.trim()} onClick={()=>{setBusy(true);setError('');void readopt(profile,{species,breed,fur,personality,name}).catch(e=>setError(storageMessage(e))).finally(()=>setBusy(false))}} aria-label="Adopt my new companion">welcome new gremlin</button><p role="alert">{error}</p><button type="button" className="text-button" onClick={()=>setAdopting(false)}>Back to farewell</button><p className="footnote">A fresh bond at 10%. Your previous companion and memories stay in the legacy scrapbook.</p></section>
  return <section className="farewell-screen game-room-scene"><CozyRoom immersive><PetSpeechBubble><PetLine species={profile.species} personality={pet.personality} event="farewell" context={profile.id} /></PetSpeechBubble><div className="farewell-pet"><PetCharacter species={profile.species} appearance={pet} mood="idle" affectionLevel={profile.affection} size="large" /></div></CozyRoom><div className="farewell-copy"><span className="eyebrow">A CHAPTER, KEPT</span><h1>small paw wave. chapter kept.</h1><p>{profile.name}'s chapter has ended after two full days without a saved, unverified adventure photo. Your memories and this companion's history stay here. Adopt a new friend whenever you're ready.</p><button type="button" className="primary-button open-readoption" onClick={()=>setAdopting(true)} aria-label="Visit the Adoption Center">choose next blob</button><button type="button" className="text-button" onClick={onMemories} aria-label="Visit previous memories">peek at old brain pages</button><button type="button" className="text-button" onClick={onAdventure}>Finish an unfinished outing</button></div></section>
}
