import { useCallback, useEffect, useState } from 'react'
import { BottomNavigation, Icon } from './components/BottomNavigation'
import { SplashScreen } from './components/SplashScreen'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Adventure } from './screens/Adventure'
import { Memories } from './screens/Memories'
import { Settings } from './screens/Settings'
import { loadProfile, saveProfile } from './lib/storage'
import type { Page, Profile } from './types/game'
import { getJourneyData, reconcileProgress } from './journey/service'
import { ChallengeContext } from './challenge/ChallengeContext'
import { useChallengeState } from './challenge/useChallengeState'
import { Farewell } from './screens/Farewell'
import { preserveProgress } from './journey/profileProgress'
import { useReminders } from './notifications/useReminders'
function App() {
  const [profile, setProfile] = useState<Profile | null>(loadProfile)
  const [intro, setIntro] = useState(() => !loadProfile())
  const [page, setPage] = useState<Page>('home')
  const [storageError, setStorageError] = useState(false)
  const recovered=useCallback((next:Profile,saved:boolean)=>{setProfile(next);setStorageError(!saved);setIntro(false);setPage('home')},[])
  const showFarewell=useCallback(()=>setPage('home'),[])
  const challenge=useChallengeState(profile,recovered,showFarewell)
  useReminders(profile,challenge.state,challenge.loading||!!challenge.error)
  const separated=challenge.state?.currentPetId===profile?.id&&challenge.state?.separatedAt!==null&&challenge.state?.separatedAt!==undefined
  useEffect(()=>{const update=(e:Event)=>{const d=(e as CustomEvent<{profile:Profile;saved:boolean}>).detail;recovered(d.profile,d.saved)};window.addEventListener('challenge-companion',update);return ()=>window.removeEventListener('challenge-companion',update)},[recovered])
  const finishIntro = useCallback(() => setIntro(false), [])
  useEffect(()=>{
    const petId=profile?.id
    if(!petId)return
    let alive=true
    const update=(event:Event)=>{const detail=(event as CustomEvent<{profile:Profile;saved:boolean}>).detail;if(alive&&detail?.profile.id===petId){setProfile(detail.profile);setStorageError(!detail.saved)}}
    const sync=()=>{void reconcileProgress().catch(()=>{/* Adventure and scrapbook show actionable IndexedDB errors. */})}
    const storage=()=>{const next=loadProfile();if(alive&&next?.id===petId)setProfile(next);sync()}
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('outside-or-else:journey'):null
    if(channel)channel.onmessage=sync
    window.addEventListener('journey-profile',update);window.addEventListener('journey-changed',sync);window.addEventListener('storage',storage)
    void getJourneyData(petId).then(data=>{if(alive&&data.active?.pet.id===petId)setPage('adventure')}).catch(()=>{})
    sync()
    return ()=>{alive=false;channel?.close();window.removeEventListener('journey-profile',update);window.removeEventListener('journey-changed',sync);window.removeEventListener('storage',storage)}
  },[profile?.id])
  function persist(next: Profile) {
    const latest=loadProfile()
    next=preserveProgress(next,latest,profile)
    const saved = saveProfile(next); setProfile(next); setStorageError(!saved); return saved
  }
  function completeOnboarding(next: Profile) {
    // Another tab may have completed setup while this screen was open.
    const existing = loadProfile()
    if (existing) { setProfile(existing); setStorageError(false) }
    else persist(next)
    setPage('home')
    setIntro(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function navigate(next: Page) { setPage(next); window.scrollTo({ top: 0, behavior: 'instant' }) }
  return <ChallengeContext.Provider value={challenge}><div className={`app-shell ${profile && !intro ? `game-shell scene-${separated&&page==='home'?'farewell':page}` : ''}`}>{intro ? <SplashScreen onDone={finishIntro} /> : !profile ? <Onboarding onComplete={completeOnboarding} /> : <>{page !== 'home' && <header className="game-header"><span className="wordmark">Outside or Else<span>!</span></span><span className="header-detail"><Icon name="leaf" /> door awaits</span></header>}{storageError && <p className="storage-warning" role="alert">Browser storage is unavailable. Your companion will stay for this session, but changes won’t survive a reload.</p>}<main id="main-content" className="game-main" key={page}>{page === 'home' && separated&&profile&&<Farewell profile={profile} onMemories={()=>navigate('memories')} onAdventure={()=>navigate('adventure')} />}{page === 'home' && !separated && <Home profile={profile} onSave={persist} onAdventure={() => navigate('adventure')} />}{page === 'adventure' && <Adventure profile={profile} />}{page === 'memories' && <Memories profile={profile} />}{page === 'settings' && <Settings profile={profile} onSave={persist} />}</main><BottomNavigation page={page} onChange={navigate} /></>}</div></ChallengeContext.Provider>
}
export default App
