import { useEffect, useRef, useState } from 'react'
import type { Mood, Reaction, Species } from '../types/game'
import type { PersonalityId } from '../pets/catalog'
import { DialogueSession, dialogueOptions, pickDialogue } from '../dialogue/index'
import type { DialogueContext } from '../dialogue/index'
export function usePetAnimation(species: Species, sound: boolean, personality?: PersonalityId, context: DialogueContext = {}) {
  const [reaction, setReaction] = useState<Reaction>(null)
  const [mood, setMood] = useState<Mood>('idle')
  const [speech, setSpeech] = useState(() => pickDialogue(dialogueOptions(species, personality, 'idle', context)))
  const session = useRef(new DialogueSession())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audio = useRef<AudioContext | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); void audio.current?.close() }, [])
  function react(action: 'petting' | 'feeding' | 'excited' | 'sleepy') {
    if (timer.current) clearTimeout(timer.current)
    setReaction(action === 'petting' || action === 'feeding' ? action : null)
    setMood(action === 'sleepy' ? 'sleepy' : action === 'excited' ? 'excited' : 'happy')
    const event = action === 'sleepy' ? 'sleeping' : action === 'excited' ? 'waking' : action
    setSpeech(session.current.next(species, personality, event, context))
    if (sound) {
      try {
        audio.current ??= new AudioContext()
        const ctx = audio.current
        void ctx.resume()
        const tone = ctx.createOscillator(), volume = ctx.createGain()
        tone.type = 'sine'; tone.frequency.setValueAtTime(action === 'feeding' ? 440 : 660, ctx.currentTime)
        volume.gain.setValueAtTime(0.035, ctx.currentTime); volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
        tone.connect(volume); volume.connect(ctx.destination); tone.start(); tone.stop(ctx.currentTime + 0.2)
      } catch { /* Audio is optional when unsupported by the browser. */ }
    }
    if (action !== 'sleepy') timer.current = setTimeout(() => { setReaction(null); setMood('idle'); setSpeech(session.current.next(species, personality, 'idle', context)) }, 3200)
  }
  return { reaction, mood, speech, react }
}
