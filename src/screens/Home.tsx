import { useDialoguePhase } from '../dialogue/useDialoguePhase'
import { PetLine } from '../components/PetLine'
import { ChallengeStatus } from '../components/ChallengeStatus'
import { useChallenge } from '../challenge/ChallengeContext'
import { useCallback, useContext, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Profile } from '../types/game'
import { usePetAnimation } from '../hooks/usePetAnimation'
import { PetCharacter } from '../components/PetCharacter'
import { CozyRoom } from '../components/CozyRoom'
import { LoveMeter } from '../components/LoveMeter'
import { PetSpeechBubble } from '../components/PetSpeechBubble'
import { Wardrobe } from '../components/Wardrobe'
import { ConversationPanel } from '../components/ConversationPanel'
import { Icon } from '../components/BottomNavigation'
import { ThemeContext } from '../theme/ThemeContext'
import { DEFAULT_ENVIRONMENT } from '../theme/resolveEnvironment'
import { formatTime, loveStage } from '../lib/storage'
export function Home({ profile, onAdventure, onSave = () => false }: { profile: Profile; onAdventure: () => void; onSave?: (profile: Profile) => boolean }) {
  const phase = useDialoguePhase()
  const theme = useContext(ThemeContext)
  const environment = theme?.resolvedEnvironment ?? DEFAULT_ENVIRONMENT
  const { reaction, mood, speech, react } = usePetAnimation(profile.species, profile.sound, profile.pet?.personality, { affection: profile.affection, phase })
  const [talkOpen, setTalkOpen] = useState(false)
  const [wardrobeOpen,setWardrobeOpen] = useState(false)
  const [conversationHeight, setConversationHeight] = useState(0)
  const [panelHeight, setPanelHeight] = useState(0)
  const closeConversation = useCallback(() => setTalkOpen(false), [])
  const challenge=useChallenge()
  const reminder=challenge?.state?.enabled&&!challenge.state.paused&&challenge.state.missedDayStreak===1
  const sceneStyle = conversationHeight ? { height: `${conversationHeight}px` } as CSSProperties : undefined
  const pointer = useRef<{ x: number; y: number } | null>(null), swiped = useRef(false)
  return <section style={sceneStyle} className={`home-screen game-room-scene${talkOpen ? ' is-conversing' : ''}${conversationHeight ? ' keyboard-visible' : ''}`} aria-label={`Outside or Else! — ${profile.name}'s room`}>
    <CozyRoom immersive conversation={talkOpen} conversationReserve={panelHeight}><PetSpeechBubble sourceLabel={talkOpen ? 'Pet reactions — offline' : undefined}>{talkOpen ? <PetLine species={profile.species} personality={profile.pet?.personality} event="talk" context={profile.id} /> : reminder && mood === 'idle' ? <PetLine species={profile.species} personality={profile.pet?.personality} event="missed-adventure" context={profile.id} /> : mood === 'idle' ? <PetLine species={profile.species} personality={profile.pet?.personality} event="idle" affection={profile.affection} context={profile.id} /> : speech}</PetSpeechBubble><button className="pet-touch" aria-label={`Pet ${profile.name}. Tap or gently swipe.`} onClick={() => { if (!swiped.current) react('petting'); swiped.current = false }} onPointerDown={e => { swiped.current = false; pointer.current = { x: e.clientX, y: e.clientY } }} onPointerUp={e => { if (pointer.current && Math.hypot(e.clientX - pointer.current.x, e.clientY - pointer.current.y) > 12) { swiped.current = true; react('petting') } pointer.current = null }} onPointerCancel={() => { pointer.current = null }}><PetCharacter appearance={profile.pet} species={profile.species} mood={talkOpen ? 'idle' : reminder&&mood==='idle'?'sad':mood} reaction={talkOpen ? null : reaction} affectionLevel={profile.affection} size="large" /></button><button type="button" className="pet-talk-orb round-button" aria-label={`Talk to ${profile.name}`} onClick={() => setTalkOpen(true)}><Icon name="talk" /></button></CozyRoom>
    <div className="room-hud"><div className="pet-hud"><h1 className="pet-name">{profile.name}</h1><ChallengeStatus /><span className="mood-tag"><span />{reaction === 'feeding' ? 'bowl business' : mood === 'idle' ? `${loveStage(profile.affection)} - blob at home` : mood === 'sleepy' ? 'OUT COLD - dream business' : mood === 'excited' ? 'leg battery ON' : 'tiny happy noises'}</span><button type="button" className="outing-chip" onClick={onAdventure}><Icon name="clock" />{formatTime(profile.outingTime)} · {profile.duration} min</button></div><div className="bond-hud"><LoveMeter value={profile.affection} /><div className="environment-controls"><span className="environment-icon" title={environment.phase} aria-label={`Environment: ${environment.phase}`}><Icon name={environment.theme === 'dark' ? 'moon' : 'sun'} /></span><button type="button" className={`round-button ${mood === 'sleepy' ? 'is-sleeping' : ''}`} aria-label={mood === 'sleepy' ? 'Wake your pet' : 'Let your pet nap'} onClick={() => react(mood === 'sleepy' ? 'excited' : 'sleepy')}><Icon name="moon" /></button><button type="button" className="round-button wardrobe-trigger" aria-label="Open wardrobe" onClick={() => { setTalkOpen(false); setWardrobeOpen(true) }}><Icon name="spark" /></button></div></div></div>
    {!talkOpen && <div className="room-actions" aria-label="Pet actions"><button type="button" className="game-action pet-action" aria-label={`Pet ${profile.name}`} onClick={() => react('petting')}><Icon name="heart" /><span>scritch</span></button><button type="button" className="game-action feed-action" aria-label={`Feed ${profile.name}`} onClick={() => react('feeding')}><Icon name="bowl" /><span>snack</span></button><button type="button" className="game-action talk-action" aria-label={`Open conversation with ${profile.name}`} onClick={() => setTalkOpen(true)}><Icon name="talk" /><span>Talk</span></button><button type="button" className="game-action adventure-action" aria-label="Go to Adventure" onClick={onAdventure}><Icon name="adventure" /><span>legs</span></button></div>}
    {wardrobeOpen && <Wardrobe profile={profile} onSave={onSave} onClose={() => setWardrobeOpen(false)} />}
    <ConversationPanel key={profile.id} open={talkOpen} profile={profile} mood={mood} phase={phase} challenge={challenge?.state ?? null} onClose={closeConversation} onViewportChange={setConversationHeight} onPanelHeight={setPanelHeight} />
  </section>
}
