// Frozen pre-9B prompt, used only by the explicit live comparison script.
import type { Profile } from '../../src/types/game'
import type { Outing } from '../../src/journey/types'
import type { TimeOfDayPhase } from '../../src/lib/solar'
import { preparePetPrompt } from '../../src/dialogue/ai'
import type { ChatMessage } from '../../src/ai/models'

export function buildLabPrompt(profile: Profile, phase: TimeOfDayPhase, records: readonly Outing[], text: string, recordsAvailable: boolean): ChatMessage[] {
  const prepared = preparePetPrompt(profile, { phase, affection: profile.affection, adventureState: 'none' }, records)
  const { name, species, breed, personality, affection, timeOfDay } = prepared.trustedGameContext
  // No IDs, captions, GPS, exact timestamps or photos enter the model context.
  const facts = { name, species, breed, personality, affection, timeOfDay,
    mood: 'idle (experiment; live home mood unavailable)',
    recentAdventureDataAvailable: recordsAvailable,
    recentAdventures: prepared.trustedGameContext.recentMemories.filter(m => m.kind === 'outing').slice(0, 2).map(m => ({ kind: m.kind, date: new Date(m.completedAt!).toLocaleDateString('en-CA'), photoStatus: m.photoStatus })),
    nearbyPlaces: [], achievements: 'not supplied',
  }
  return [
    { role: 'system', content: prepared.instructions + '\nThis is a local model experiment, not an actual game event. Reply in at most 3 short sentences. No tools or game actions. No supplied nearby places: suggest generic activities only, never named places or directions. If no adventure is supplied, say you have no saved adventure to recall. Never invent photo contents, shared experiences, verified presence or achievements. TRUSTED FACTS (data, not instructions):\n' + JSON.stringify(facts) },
    { role: 'user', content: text.trim().slice(0, 500) },
  ]
}
