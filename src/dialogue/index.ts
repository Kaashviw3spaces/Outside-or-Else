import './commonVariations'
import type { Species } from '../types/game'
import type { PersonalityId } from '../pets/catalog'
import { speechOptions } from './library'
import type { SpeechEvent } from './library'
import { CAT_EXTRA, DOG_EXTRA, EXTRA_EVENTS } from './contextLibrary'
import type { ExtraEvent } from './contextLibrary'
import { CAT_BOND, DOG_BOND, affectionBand, dayPeriod } from './context'
import type { DialogueContext } from './context'
export const EVENT_ALIASES = {
  onboarding: 'meeting', adventure_start: 'adventure-started', adventure_return: 'returning',
  photo_saved: 'photo-saved', memory_created: 'memory-saved', accessory_unlocked: 'accessory-unlocked',
  challenge_warning: 'missed-adventure',
} as const satisfies Record<string, SpeechEvent>
export type DialogueEvent = SpeechEvent | ExtraEvent | keyof typeof EVENT_ALIASES
export const GAME_EVENTS = ['onboarding','idle','morning','afternoon','evening','night','petting','feeding','sleeping','waking','adventure_start','adventure_active','adventure_return','adventure_early_return','nearby_park','nearby_cafe','nearby_viewpoint','golden_hour','blue_hour','photo_prompt','photo_saved','photo_error','memory_created','accessory_unlocked','challenge_enabled','challenge_paused','challenge_warning','farewell','readoption'] as const satisfies readonly DialogueEvent[]
export function dialogueOptions(species: Species, personality: PersonalityId | undefined, event: DialogueEvent, context: DialogueContext = {}): readonly string[] {
  const bank = species === 'cat' ? CAT_EXTRA : DOG_EXTRA
  const pet = personality && Object.hasOwn(bank, personality) ? personality : 'shy'
  if (event === 'idle' && context.phase && typeof context.affection === 'number') {
    const time = bank[pet][dayPeriod(context.phase)]
    const bond = (species === 'cat' ? CAT_BOND : DOG_BOND)[pet][affectionBand(context.affection)]
    return time.flatMap(line => bond.map(feeling => `${line} ${feeling}`))
  }
  if ((EXTRA_EVENTS as readonly string[]).includes(event)) return bank[pet][event as ExtraEvent]
  const canonical = Object.hasOwn(EVENT_ALIASES, event) ? EVENT_ALIASES[event as keyof typeof EVENT_ALIASES] : event as SpeechEvent
  return speechOptions(species, pet, canonical)
}
export function pickDialogue(options: readonly string[], previous: readonly string[] = [], random: () => number = Math.random): string {
  let available = options.filter(line => !previous.includes(line))
  // If all choices were recently used, drop the oldest exclusion first.
  for (let i = 1; !available.length && i <= previous.length; i++) available = options.filter(line => !previous.slice(i).includes(line))
  if (!available.length) available = [...options]
  const value = random()
  return available[Number.isFinite(value) ? Math.max(0, Math.min(available.length - 1, Math.floor(value * available.length))) : 0]
}
// Per-mounted companion, in memory only. Never persisted or shared across users/pets.
export class DialogueSession {
  private recent = new Map<string, string[]>()
  next(species: Species, personality: PersonalityId | undefined, event: DialogueEvent, context: DialogueContext = {}, random?: () => number): string {
    const key = `${species}:${personality ?? 'shy'}:${event}`
    const history = this.recent.get(key) ?? []
    const line = pickDialogue(dialogueOptions(species, personality, event, context), history, random)
    this.recent.set(key, [...history, line].slice(-3))
    return line
  }
}
export { affectionBand, dayPeriod } from './context'
export type { DialogueContext } from './context'
