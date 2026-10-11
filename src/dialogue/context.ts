import type { Species } from '../types/game'
import type { PersonalityId } from '../pets/catalog'
import type { TimeOfDayPhase } from '../lib/solar'
export type AffectionBand = 'new' | 'familiar' | 'bonded'
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night'
export type AdventureState = 'none' | 'active' | 'returned' | 'early-return' | 'completed'
export interface DialogueContext {
  affection?: number
  phase?: TimeOfDayPhase
  adventureState?: AdventureState
}
export interface CompanionIdentity { species: Species; personality?: PersonalityId; name?: string; breed?: string }
export function affectionBand(value: number): AffectionBand {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 10
  return safe <= 30 ? 'new' : safe <= 70 ? 'familiar' : 'bonded'
}
export function dayPeriod(phase: TimeOfDayPhase): DayPeriod {
  return phase === 'sunrise' ? 'morning' : phase === 'golden-hour' || phase === 'blue-hour' ? 'evening' : phase
}
export const CAT_BOND: Record<PersonalityId, Record<AffectionBand, readonly string[]>> = {
  playful: { new: ['who human? shoes interesting!', 'new human; i do cautious wiggle.'], familiar: ['human familiar; paws go happy zoom.', 'human face acceptable; possible play colleague.'], bonded: ['MY FAVORITE TALL FEET ANIMAL!', 'favorite human; all my wiggles for you.'] },
  sleepy: { new: ['new human; possible pillow?', 'who human? i consider after nap.'], familiar: ['human familiar; nap neighbor approved.', 'human face acceptable; blanket potential.'], bonded: ['favorite human; warm nap neighbor.', 'my human; i share royal pillow.'] },
  curious: { new: ['who human? why legs so tall?', 'new human; many nose questions.'], familiar: ['human familiar; face passed inspection.', 'human face acceptable; still investigating ears.'], bonded: ['favorite human; best unsolved mystery.', 'my tall feet animal; nose says friend.'] },
  shy: { new: ['new human... i peek gently.', 'who human? i come little closer?'], familiar: ['human familiar; i lean softly.', 'human face kind; little prrr.'], bonded: ['favorite human... tiny brave cuddle.', 'my human; i stay close, prrr.'] },
  mischievous: { new: ['who human? suspicious tall feet.', 'new human; ear touching under review.'], familiar: ['human face acceptable; 6/10 tall creature.', 'human familiar; door council approves.'], bonded: ['MY FAVORITE TALL FEET ANIMAL.', 'my human; tiny ruler very attached.'] },
}
export const DOG_BOND: Record<PersonalityId, Record<AffectionBand, readonly string[]>> = {
  playful: { new: ['New human! Potential shoe friend!', 'Who human? Tail wants introduction!'], familiar: ['Familiar human! Tail happy!', 'Your face gets enthusiastic tail votes!'], bonded: ['MY FAVORITE HUMAN! WOOF!', 'My human! All my wiggles for you!'] },
  sleepy: { new: ['New human; cozy neighbor maybe?', 'Who human? Pillow potential.'], familiar: ['Familiar human; slow tail thump.', 'Your face seems wonderfully cozy.'], bonded: ['Favorite human; best nap neighbor.', 'My human; gentle sleepy tail thump.'] },
  curious: { new: ['New human! Nose has questions!', 'Who human? Why such tall legs?'], familiar: ['Familiar human; nose approves.', 'Your face is a lovely ongoing mystery!'], bonded: ['Favorite human; endless interesting friend!', 'My human! Nose says best teammate!'] },
  shy: { new: ['New human... little hello.', 'Who human? A small cautious wag.'], familiar: ['Familiar human; gentle lean.', 'Your face is kind; quiet tail thump.'], bonded: ['Favorite human; soft brave wag.', 'My human; little loyal lean.'] },
  mischievous: { new: ['New human! Shoe inspection pending!', 'Who human? Goofy committee investigates!'], familiar: ['Familiar human; honorary tail committee!', 'Your face earns six enthusiastic sock votes!'], bonded: ['MY FAVORITE HUMAN! BORK!', 'My human; goofy tail forever on your team!'] },
}
