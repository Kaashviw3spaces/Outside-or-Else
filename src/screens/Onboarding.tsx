import { PetLine } from '../components/PetLine'
import { createPetId } from '../lib/petId'
import { useRef, useState } from 'react'
import type { Activity, Duration, Profile, Species } from '../types/game'
import { PetCharacter } from '../components/PetCharacter'
import { Icon } from '../components/BottomNavigation'
import { ActivityPicker, DurationPicker } from '../components/PreferenceFields'
import { formatTime } from '../lib/storage'
import { AdoptionPicker, PersonalityPicker } from '../components/AdoptionPicker'
import { getBreed } from '../pets/catalog'
import type { FurId, PersonalityId } from '../pets/catalog'
import { adoptPet } from '../pets/save'
const headings = ['tiny ruler.\nbig shoe demands.', 'choose blob.', 'name this gremlin.', 'what outside things?', 'what hour do we\nevacuate house?', 'how long do\nlegs wander?', 'CONGRATULATIONS.\ntiny creature acquired.']
const descriptions = ['human. less rectangle. more grass. tiny ruler awaits.', 'cat or dog? choose your boss.', 'name boss. boss judges syllables.', 'trees? books? bean water? pick outside.', 'pick shoe hour. change it anytime.', 'short walk counts. giant legs optional.', 'boss acquired. shoes are your problem.']
export function Onboarding({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [step, setStep] = useState(0)
  const [completionError, setCompletionError] = useState('')
  const completing = useRef(false)
  const [species, setSpecies] = useState<Species>('cat')
  const [name, setName] = useState('')
  const [breed,setBreed] = useState('orange-tabby')
  const [fur,setFur] = useState<FurId>('orange')
  const [personality,setPersonality] = useState<PersonalityId>('playful')
  const [activities, setActivities] = useState<Activity[]>(['Walking'])
  const [time, setTime] = useState('17:30')
  const [duration, setDuration] = useState<Duration>(10)
  const petName = name.trim() || (species === 'cat' ? 'Miso' : 'Maple')
  function moveStep(nextStep: number) { setStep(nextStep); window.scrollTo({ top: 0, behavior: 'instant' }) }
  function next() {
    if (step < 6) moveStep(step + 1)
    else {
      if (completing.current) return
      completing.current = true
      setCompletionError('')
      try {
        const id = createPetId()
        onComplete({ id, species, name: petName, activities, outingTime: time || '17:30', duration, affection: 10, sound: false, notifications: false, pet: adoptPet(species,breed,fur,personality,id) })
      } catch {
        completing.current = false
        setCompletionError('We couldn’t finish setting up your companion. Your choices are still here. Tap the button again to retry.')
      }
    }
  }
  return <main className="onboarding"><header className="onboarding-header"><span className="wordmark">Outside or Else<span>!</span></span><span className="step-label">{step + 1} / 7</span></header><div className="step-track" aria-label={`Step ${step + 1} of 7`}>{headings.map((_, i) => <span key={i} className={i <= step ? 'complete' : ''} />)}</div><section className="onboarding-content" key={step}><span className="eyebrow">{step === 6 ? 'YOUR NEW CHAPTER' : 'LET’S GET TO KNOW YOU'}</span><h1>{headings[step]}</h1><p className="intro-copy">{descriptions[step]}</p>
    {step === 0 && <div className="welcome-pets"><PetCharacter species="cat" mood="idle" affectionLevel={10} size="medium" /><PetCharacter species="dog" mood="happy" affectionLevel={10} size="medium" /><span className="welcome-caption">tiny paws. enormous shoe agenda.</span></div>}
    {step === 1 && <AdoptionPicker species={species} breed={breed} fur={fur} personality={personality} onSpecies={s => { setSpecies(s); setName(''); setBreed(s === 'cat' ? 'orange-tabby' : 'shiba-inu'); setFur('orange') }} onBreed={id => { setBreed(id); setFur(getBreed(id,species).fur[0]) }} onFur={setFur} />}
    {step === 2 && <div className="name-step"><PetCharacter species={species} appearance={adoptPet(species,breed,fur,personality,"preview","2000-01-01T00:00:00Z")} mood="happy" affectionLevel={10} size="medium" /><label htmlFor="pet-name">gremlin name</label><input id="pet-name" aria-label="Your companion's name" autoComplete="off" maxLength={24} placeholder={species === 'cat' ? 'Miso' : 'Maple'} value={name} onChange={e => setName(e.target.value)} /><small>Up to 24 characters. {petName} has a nice ring to it.</small><PersonalityPicker value={personality} onChange={setPersonality} /></div>}
    {step === 3 && <ActivityPicker value={activities} onChange={setActivities} />}
    {step === 4 && <div className="time-step"><div className="sun-doodle"><Icon name="sun" /></div><label htmlFor="outing-time">shoe o'clock</label><input id="outing-time" aria-label="Preferred outdoor time" type="time" value={time} required onChange={e => setTime(e.target.value)} /><small>Your walk time. Set reminders in Settings.</small></div>}
    {step === 5 && <div className="duration-step"><Icon name="leaf" className="duration-leaf" /><DurationPicker value={duration} onChange={setDuration} /><div className="gentle-note">little legs plan. no marathon demanded.</div></div>}
    {step === 6 && <div className="meet-step"><div className="meet-pet"><PetCharacter species={species} appearance={adoptPet(species,breed,fur,personality,"preview","2000-01-01T00:00:00Z")} mood="excited" affectionLevel={10} size="large" /></div><h2>Meet {petName}.</h2><p><PetLine species={species} personality={personality} event="meeting" /></p><span className="meet-plan"><Icon name="sun" /> {formatTime(time || '17:30')} · {duration} minutes · a fresh start</span></div>}
  </section><footer className="onboarding-footer">{completionError && <p className="gentle-note" role="alert">{completionError}</p>}<button type="button" className="primary-button" aria-label={step === 0 ? 'Choose a companion' : step === 6 ? 'Complete adoption and go Home' : 'Continue onboarding'} onClick={next} disabled={step === 4 && !time}>{step === 0 ? 'choose blob' : step === 6 ? 'bring gremlin home' : 'next tiny decision'}<Icon name="arrow" /></button><div className="onboarding-secondary">{step > 0 && <button className="text-button" onClick={() => moveStep(step - 1)}>Back</button>}{step >= 3 && step <= 5 && <button className="text-button" onClick={() => { if (step === 4 && !time) setTime('17:30'); moveStep(step + 1) }}>Skip for now</button>}</div></footer></main>
}
