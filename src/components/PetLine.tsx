import { useState } from 'react'
import type { Species } from '../types/game'
import type { PersonalityId } from '../pets/catalog'
import { dialogueOptions, pickDialogue, affectionBand, dayPeriod } from '../dialogue/index'
import type { DialogueEvent, DialogueContext } from '../dialogue/index'
import { useDialoguePhase } from '../dialogue/useDialoguePhase'
type Props = { species: Species; personality?: PersonalityId; event: DialogueEvent; context?: string; affection?: number; facts?: DialogueContext }
function StableLine({ species, personality, event, facts }: Props) {
  const [line] = useState(() => pickDialogue(dialogueOptions(species, personality, event, facts)))
  return <span data-speech-phase={facts?.phase} data-affection-band={typeof facts?.affection === 'number' ? affectionBand(facts.affection) : undefined} data-pet-speech={event} data-speech-species={species} data-speech-personality={personality ?? 'shy'}>{line}</span>
}
// Re-select only for a new event, companion, period or affection band, not timer ticks.
export function PetLine(props: Props) {
  const phase = useDialoguePhase(props.event === 'idle')
  const facts = { phase, affection: props.affection, ...props.facts }
  const cue = props.event === 'idle' ? `${typeof facts.affection === 'number' ? affectionBand(facts.affection) : ''}:${facts.phase ? dayPeriod(facts.phase) : ''}` : ''
  return <StableLine key={`${props.context ?? ''}:${props.species}:${props.personality ?? 'shy'}:${props.event}:${cue}`} {...props} facts={facts} />
}
