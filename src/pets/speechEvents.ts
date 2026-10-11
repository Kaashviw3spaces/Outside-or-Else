import type { Profile } from '../types/game'
import type { Outing } from '../journey/types'
import type { SpeechEvent } from './dialogue'
import { normalizePet } from './save'
// Only a completed outing recorded in this pet's ledger can announce a new unlock.
export function completionSpeechEvent(record: Outing, profile: Profile): SpeechEvent {
  const pet = normalizePet(profile)
  const recorded = pet.relationshipHistory.some(event => event.type === 'adventure-completed' && event.adventureId === record.id)
  const before = normalizePet({ ...profile, pet: { ...pet, relationshipHistory: pet.relationshipHistory.filter(event => event.adventureId !== record.id) } })
  const newAccessory = pet.unlockedAccessories.some(id => !before.unlockedAccessories.includes(id) && !(record.pet.appearance.unlockedAccessories ?? []).includes(id))
  return record.status === 'completed' && record.kind === 'outing' && record.eligible && profile.id === record.pet.id && recorded && newAccessory
    ? 'accessory-unlocked' : 'memory-saved'
}
