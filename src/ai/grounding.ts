import type { Profile } from '../types/game'
import type { Outing } from '../journey/types'
import type { TimeOfDayPhase } from '../lib/solar'
import type { AdventureState } from '../dialogue/context'

export type Fact<T> = { status: 'KNOWN'; value: T } | { status: 'UNKNOWN' | 'UNAVAILABLE' }
export const known = <T,>(value: T): Fact<T> => ({ status: 'KNOWN', value })
export const unknown = (): Fact<never> => ({ status: 'UNKNOWN' })
export const unavailable = (): Fact<never> => ({ status: 'UNAVAILABLE' })
export type MemoryFact = { date: Fact<string>; plannedPlace: Fact<string>; photo: Fact<'saved-unverified' | 'no-photo' | 'missing-file'> }
export type GroundedContext = {
  name: Fact<string>; species: Fact<string>; breed: Fact<string>; personality: Fact<string>; affection: Fact<number>
  mood: Fact<string>; timeOfDay: Fact<string>; adventureState: Fact<string>
  adventures: Fact<{ total: number; relevant: MemoryFact[] }>
  photos: Fact<{ saved: number; verification: 'not-verified' }>
  nearbyPlaces: Fact<{ source: 'saved-cache-not-current-location'; names: string[] }>
}
const safeName = (name: string) => name.trim().slice(0, 80)
const validDate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 8.64e15
export function completedAdventures(profile: Profile, records: readonly Outing[]) {
  return records.filter(r => r.kind === 'outing' && r.pet?.id === profile.id && r.status === 'completed' && !r.memoryDeleted)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
}
export function buildGroundedContext(profile: Profile, phase: TimeOfDayPhase, records: readonly Outing[], question: string, available: boolean,
  state: AdventureState | 'unavailable' = available ? 'none' : 'unavailable', photoKeys?: ReadonlySet<string>, nearbyNames?: readonly string[], profileSaved = true): GroundedContext {
  const history = available ? completedAdventures(profile, records) : []
  const words = question.toLowerCase().match(/[\p{L}\p{N}-]{3,}/gu) ?? []
  const score = (r: Outing) => words.filter(w => r.destination?.name?.toLowerCase().includes(w) || (validDate(r.completedAt) && new Date(r.completedAt).toISOString().slice(0, 10).includes(w))).length
  const ranked = [...history].sort((a, b) => score(b) - score(a)), matches = ranked.filter(r => score(r) > 0)
  const relevant = (matches.length ? matches : ranked).slice(0, /\b(last|latest|most recent)\b/i.test(question) ? 1 : 2)
  const savedPhotos = new Set(records.filter(r => r.pet?.id === profile.id && r.status === 'completed' && !r.memoryDeleted && r.photoId && photoKeys?.has(r.photoId)).map(r => r.photoId)).size
  return {
    name: profileSaved ? known(safeName(profile.name)) : unknown(), species: profileSaved ? known(profile.species) : unknown(),
    breed: profileSaved && profile.pet?.breed ? known(profile.pet.breed) : unknown(), personality: profileSaved && profile.pet?.personality ? known(profile.pet.personality) : unknown(),
    affection: profileSaved && Number.isFinite(profile.affection) ? known(profile.affection) : unknown(),
    mood: unavailable(), timeOfDay: known(phase), adventureState: state === 'unavailable' ? unavailable() : known(state),
    adventures: available ? known({ total: history.length, relevant: relevant.map(r => ({
      date: validDate(r.completedAt) ? known(new Date(r.completedAt).toISOString().slice(0, 10)) : unknown(),
      // A planned destination does not prove a visit actually took place there.
      plannedPlace: r.destination?.name?.trim() ? known(safeName(r.destination.name)) : unknown(),
      photo: !r.photoId ? known('no-photo' as const) : !photoKeys ? unknown() : known(photoKeys.has(r.photoId) ? 'saved-unverified' as const : 'missing-file' as const),
    })) }) : unavailable(),
    photos: available && photoKeys ? known({ saved: savedPhotos, verification: 'not-verified' }) : unavailable(),
    nearbyPlaces: nearbyNames ? known({ source: 'saved-cache-not-current-location', names: nearbyNames.slice(0, 3).map(safeName) }) : unavailable(),
  }
}
export type FactIntent = 'adventures' | 'photos' | 'places' | 'identity' | 'mood' | null
export function factualIntent(text: string): FactIntent {
  if (!/^\s*(do\b|does\b|did\b|are\b|is\b|how\b|what\b|which\b|show\b|have\b|when\b|where\b|can you (show|recall|remember)|tell me (about|when|where)|recall\b)/i.test(text)) return null
  if (/\b(photo|picture)s?\b/i.test(text) && /\b(saved|have|verified|proof|many|last|show)\b/i.test(text)) return 'photos'
  if (/\b(adventure|outing|trip|visit|walk)s?\b/i.test(text) && /\b(last|previous|remember|saved|many|when|where|date|did|been|history|recall)\b/i.test(text)) return 'adventures'
  if (/\b(nearby|cached|saved)\b.*\b(places|parks|caf[eé]s?)\b/i.test(text)) return 'places'
  if (/\b(what|which|how much)\b.*\b(name|breed|species|personality|affection)\b/i.test(text)) return 'identity'
  if (/\b(current|your) mood\b/i.test(text)) return 'mood'
  return null
}
export function deterministicFacts(context: GroundedContext, intent: Exclude<FactIntent, null>): string {
  // Data report, clearly separate from model inference. No pet dialogue fallback.
  const selected = intent === 'adventures' ? { adventures: context.adventures, adventureState: context.adventureState }
    : intent === 'photos' ? { photos: context.photos, note: 'Saved images are not verified outdoor proof.' }
    : intent === 'places' ? { nearbyPlaces: context.nearbyPlaces }
    : intent === 'mood' ? { mood: context.mood }
    : { name: context.name, species: context.species, breed: context.breed, personality: context.personality, affection: context.affection }
  return JSON.stringify(selected, null, 2)
}
