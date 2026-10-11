import type { Profile } from '../types/game'
import type { GroundedContext, Fact } from './grounding'
import { factualIntent } from './grounding'
import type { ChallengeState } from '../challenge/rules'
import type { Outing } from '../journey/types'
import { rewardFor, localDay } from '../journey/rewards'

export function talkFactIntent(text: string) {
  if(/^\s*(?:what(?:\s+is|'s)\s+my\s+name|(?:do|can)\s+you\s+(?:know|remember)\s+my\s+name)\s*\??\s*$/i.test(text))return 'human-name'
  const existing = factualIntent(text)
  if (/\b(challenge|rules?|grace|streak|farewell|separat(?:ed|ion)|leave me|lose (?:you|my pet))\b/i.test(text)) return 'challenge'
  if (/\b(rewards?|affection|love (?:meter|level|points)|points|earned|unlocks?|accessor(?:y|ies)|wardrobe)\b/i.test(text)) return 'rewards'
  if (existing) return existing
  if (/\b(nearby|cached|parks?|caf[eé]s?|destinations?|where (?:should|can) we go|places? (?:to go|saved))\b/i.test(text)) return 'places'
  if (/\b(photos?|pictures?|scrapbook|memories|memory|recorded|saved|verified|proof)\b/i.test(text)) return 'memories'
  if (/\b(breed|species|personality|your name|my pet(?:'s)? name|your mood|current mood)\b/i.test(text)) return 'identity'
  if (/\b(adventures?|outings?|trips?|visits?|walks?|went|visited|remember|yesterday|last week)\b/i.test(text)
    && /\b(our|we|my|past|last|previous|history|when|where|how many|did|remember|went|visited|completed)\b/i.test(text)) return 'adventures'
  if (/\b(what did we do|what (?:do|can) you remember|tell me about our past|where have we been|what happened (?:yesterday|last))\b/i.test(text)) return 'adventures'
  return null
}
export type TalkIntent = Exclude<ReturnType<typeof talkFactIntent>, null>
const value = <T,>(fact: Fact<T>, render: (v: T) => string): string => fact.status === 'KNOWN' ? render(fact.value) : fact.status === 'UNKNOWN' ? 'Not recorded.' : 'Unavailable right now.'
export function formatTalkFacts(intent: TalkIntent, context: GroundedContext, profile: Profile, challenge: ChallengeState | null, records?: readonly Outing[]): string {
  if(intent==='human-name')return `Your name is not recorded in this game. Your companion's saved name is ${value(context.name,String)}.`
  if (intent === 'challenge') {
    const state = challenge?.currentPetId === profile.id ? challenge : null
    return `Challenge rules: optional; two full missed local days after the grace period can end this companion's chapter. Only a completed outing with a saved photo qualifies; photos are unverified. Pausing/turning it off protects the companion. Chat never changes challenge state.\nCurrent status: ${state ? !state.enabled ? 'off' : state.paused ? 'paused' : state.separatedAt !== null ? 'chapter ended' : `active; ${state.missedDayStreak} missed full day(s)` : 'unavailable right now'}.`
  }
  if (intent === 'rewards') {
    const base = `Affection: ${profile.affection}/100. Reward rules: ${rewardFor({kind:'outing',elapsedMs:300000,plannedMinutes:5},false,0,0).awarded} points for completing the time goal, +1 for a saved photo; at most 3 points per local day and 100 affection. Manual memories earn no rewards. Chat earns no points. Unlock details are in Wardrobe.`
    if (!records) return base + '\nRecorded rewards: unavailable right now.'
    const outings = records.filter(r => r.pet?.id === profile.id && r.kind === 'outing' && r.status === 'completed')
    const total = outings.reduce((n,r)=>n+(r.reward?.awarded ?? 0),0)
    const today = outings.filter(r=>r.reward?.day === localDay(Date.now())).reduce((n,r)=>n+(r.reward?.awarded ?? 0),0)
    return base + `\nRecorded awarded points: ${total} total; ${today} today. Deleted scrapbook entries do not undo awarded rewards.`
  }
  if (intent === 'places') return value(context.nearbyPlaces, p=>p.names.length ? `Saved nearby search: ${p.names.join(', ')}. These are cached names, not your current location or proof of a visit. Availability is not checked.` : 'The saved nearby search contains no places. No location search was run.')
  if (intent === 'adventures') return value(context.adventures, a=>`Completed saved adventures: ${a.total}.` + a.relevant.map(r=>`\nDate (UTC): ${value(r.date,String)} Planned place: ${value(r.plannedPlace,String)} Photo: ${value(r.photo,String)}.`).join('') + '\nA planned place is not a verified visit. Chat does not start or finish adventures.')
  if (intent === 'photos' || intent === 'memories') {
    const photos = value(context.photos, p=>`${p.saved} saved photo(s). Images are not verified outdoor proof; chat does not inspect their contents.`)
    const saved = records?.filter(r=>r.pet?.id===profile.id && r.status==='completed' && !r.memoryDeleted)
    const memories = saved ? `Saved memories: ${saved.length}; ${saved.filter(r=>r.kind==='manual').length} manual upload(s). ` : 'Saved memory count: unavailable right now. '
    return (intent === 'photos' ? '' : memories + value(context.adventures,a=>`${a.total} completed saved adventure(s). `)) + photos + '\nOpen Memories for individual scrapbook entries; no saved records were changed.'
  }
  if (intent === 'mood') return `Current mood: ${value(context.mood,String)}`
  return `Name: ${value(context.name,String)} Species: ${value(context.species,String)} Breed: ${value(context.breed,String)} Personality: ${value(context.personality,String)} Affection: ${value(context.affection,n=>`${n}/100`)} Current mood: ${value(context.mood,String)}`
}
