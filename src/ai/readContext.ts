import type { Profile } from '../types/game'
import type { TimeOfDayPhase } from '../lib/solar'
import { getJourneyData } from '../journey/service'
import { openJourneyDB, requestValue, transactionDone } from '../journey/database'
import { loadNearbyCache } from '../lib/nearby'
import { buildGroundedContext } from './grounding'

export async function readLabContext(profile: Profile, phase: TimeOfDayPhase, question: string, saved: boolean) {
  // No geolocation/search, photo blobs, writes, rewards or gameplay hooks.
  const cache = loadNearbyCache()
  const names = cache?.places.map(p => p.name)
  if (!saved) return buildGroundedContext(profile, phase, [], question, false, 'unavailable', undefined, names, false)
  try {
    const data = await getJourneyData(profile.id)
    let keys: Set<string> | undefined
    try {
      const db = await openJourneyDB(), tx = db.transaction('photos', 'readonly'), done = transactionDone(tx)
      const ids = await requestValue<IDBValidKey[]>(tx.objectStore('photos').getAllKeys())
      await done; keys = new Set(ids.map(String))
    } catch { /* Photo access failure is UNAVAILABLE, never proof of no photos. */ }
    return buildGroundedContext(profile, phase, data.memories, question, true,
      data.active?.kind === 'outing' && (data.active.status === 'active' || data.active.status === 'returned') ? data.active.status : 'none', keys, names)
  } catch { return buildGroundedContext(profile, phase, [], question, false, 'unavailable', undefined, names) }
}
