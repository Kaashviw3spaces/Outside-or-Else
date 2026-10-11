import type { Mood, Profile } from '../types/game'
import type { TimeOfDayPhase } from '../lib/solar'
import type { Outing } from '../journey/types'
import { openJourneyDB, requestValue, transactionDone } from '../journey/database'
import { readLabContext } from './readContext'
import { known } from './grounding'
export async function readTalkContext(profile: Profile, phase: TimeOfDayPhase, question: string, mood: Mood, rewards = false) {
  const context = await readLabContext(profile, phase, question, true)
  context.mood = known(mood)
  let records: Outing[] | undefined
  if (rewards) {
    try {
      const db = await openJourneyDB(), tx = db.transaction('outings','readonly'), done = transactionDone(tx)
      records = await requestValue<Outing[]>(tx.objectStore('outings').getAll()); await done
    } catch { /* Do not infer zero rewards from inaccessible storage. */ }
  }
  return { context, records }
}
