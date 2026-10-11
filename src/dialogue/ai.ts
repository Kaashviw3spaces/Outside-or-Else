import type { Profile } from '../types/game'
import type { Outing } from '../journey/types'
import type { DialogueContext } from './context'
import { affectionBand } from './context'
import { buildPetSpeechInstructions } from '../pets/speechInstructions'
import { normalizePet } from '../pets/save'
// Prompt preparation only. Facts are separate data, never pasted into instructions.
export function preparePetPrompt(profile: Profile, context: DialogueContext, records: readonly Outing[] = []) {
  const pet = normalizePet(profile)
  const recentMemories = records.filter(record => record.pet.id === profile.id && record.status === 'completed' && !record.memoryDeleted && typeof record.completedAt === 'number' && Number.isFinite(record.completedAt))
    .sort((a, b) => b.completedAt! - a.completedAt!).slice(0, 5).map(record => ({
      id: record.id, kind: record.kind, completedAt: record.completedAt,
      plannedDestination: record.destination?.name ?? null,
      caption: record.caption.slice(0, 500), photoStatus: record.photoId ? 'unverified' : 'no-photo',
    }))
  return {
    instructions: buildPetSpeechInstructions(profile.species, pet.personality),
    trustedGameContext: {
      petId: profile.id, name: profile.name, species: profile.species, breed: pet.breed,
      personality: pet.personality, affection: profile.affection, affectionBand: affectionBand(profile.affection),
      timeOfDay: context.phase ?? 'unknown', adventureState: context.adventureState ?? 'none', recentMemories,
    },
  }
}
