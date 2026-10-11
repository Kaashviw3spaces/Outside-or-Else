import { useEffect } from 'react'
import { PetCharacter } from './PetCharacter'
import { Icon } from './BottomNavigation'
import { SkyLights } from './SkyLights'
export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const timeout = setTimeout(onDone, 4200); return () => clearTimeout(timeout) }, [onDone])
  return <main className="splash"><svg className="splash-sky" viewBox="0 0 480 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><SkyLights x={392} y={115} radius={25} stars={[[42, 185], [122, 70], [314, 45], [412, 312], [85, 427], [337, 465]]} /></svg><button className="skip-splash" onClick={onDone}>Skip intro <Icon name="arrow" /></button><div className="splash-copy"><span className="eyebrow">TINY PET. BIG DEMANDS.</span><h1>Outside<br /><span>or Else</span><span className="title-dot">!</span></h1><p>human. door exists.<br />use door.</p></div><div className="splash-peek"><PetCharacter species="cat" mood="annoyed" affectionLevel={10} size="large" orange /></div><span className="splash-note">you are my human. touch grass.</span></main>
}
