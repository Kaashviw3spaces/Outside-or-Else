import type { Profile, Species } from '../types/game'
import { ACCESSORIES, getBreed } from './catalog'
import type { AccessoryId, FurId, PersonalityId } from './catalog'
import { PERSONALITIES } from './personality'
export interface RelationshipEvent { id: string; type: 'adopted' | 'adventure-completed'; date: string; adventureId?: string }
export interface PetDetails {
  breed: string; furVariation: FurId; personality: PersonalityId; equippedAccessory: AccessoryId | null; unlockedAccessories: AccessoryId[]
  unlockedFurVariations: FurId[]; adoptedAt: string | null; generation: number; relationshipHistory: RelationshipEvent[]
}
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
export function completedAdventures(history: RelationshipEvent[]): number {
  return new Set(history.filter(e => e.type === 'adventure-completed' && e.adventureId && validDate(e.date)).map(e => e.adventureId)).size
}
export function unlockedAccessories(history: RelationshipEvent[]): AccessoryId[] { const count = completedAdventures(history); return ACCESSORIES.filter(a => count >= a.adventures).map(a => a.id) }
export function normalizePet(profile: Pick<Profile,'species' | 'pet'>): PetDetails {
  const old = profile.pet
  const breed = getBreed(old?.breed, profile.species)
  const history = Array.isArray(old?.relationshipHistory) ? old.relationshipHistory.filter(e => e && typeof e.id === 'string' && ['adopted','adventure-completed'].includes(e.type) && validDate(e.date) && (e.type !== 'adventure-completed' || typeof e.adventureId === 'string' && !!e.adventureId.trim())).map(e => ({...e})) : []
  const unlocked = unlockedAccessories(history)
  return {
    breed:breed.id,furVariation:breed.fur.includes(old?.furVariation as FurId) ? old!.furVariation : breed.fur[0],
    personality:old?.personality && Object.hasOwn(PERSONALITIES,old.personality) ? old.personality : 'shy',
    equippedAccessory:old?.equippedAccessory && unlocked.includes(old.equippedAccessory) ? old.equippedAccessory : null,
    unlockedAccessories:unlocked,unlockedFurVariations:[...breed.fur],adoptedAt:validDate(old?.adoptedAt) ? old.adoptedAt : null,
    generation:Number.isInteger(old?.generation) && old!.generation > 0 ? old!.generation : 1,relationshipHistory:history,
  }
}
export function adoptPet(species: Species, breed: string, furVariation: FurId, personality: PersonalityId, id: string, date = new Date().toISOString()): PetDetails {
  return normalizePet({species,pet:{breed,furVariation,personality,equippedAccessory:null,unlockedAccessories:[],unlockedFurVariations:[],adoptedAt:date,generation:1,relationshipHistory:[{id:`${id}:adopted`,type:'adopted',date}]}})
}
