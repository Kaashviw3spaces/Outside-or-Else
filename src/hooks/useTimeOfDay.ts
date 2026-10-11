import { useMemo, useSyncExternalStore } from 'react'
import { getEnvironment } from '../lib/solar'
import { forgetLocation, getLocation, requestLocation, subscribeLocation } from '../lib/location'
import { startEnvironmentScheduler } from '../lib/environmentScheduler'
let environment = getEnvironment(new Date(), getLocation().coordinates)
let signature = JSON.stringify(environment)
const listeners = new Set<() => void>()
let clock: ReturnType<typeof startEnvironmentScheduler> | null = null
let unsubscribeLocation: (() => void) | null = null
function refresh() {
  const next = getEnvironment(new Date(), getLocation().coordinates)
  const nextSignature = JSON.stringify(next)
  if (signature !== nextSignature) { environment = next; signature = nextSignature; listeners.forEach(listener => listener()) }
  return next.nextBoundary
}
function subscribeEnvironment(listener: () => void) {
  listeners.add(listener)
  if (!clock) { clock = startEnvironmentScheduler(refresh); unsubscribeLocation = subscribeLocation(() => clock?.wake()) }
  return () => { listeners.delete(listener); if (!listeners.size) { clock?.stop(); clock = null; unsubscribeLocation?.(); unsubscribeLocation = null } }
}
const getSnapshot = () => environment
const noSubscribe = () => () => {}
export function useTimeOfDay(enabled: boolean) {
  const current = useSyncExternalStore(enabled ? subscribeEnvironment : noSubscribe, getSnapshot, getSnapshot)
  const location = useSyncExternalStore(subscribeLocation, getLocation, getLocation)
  return useMemo(() => ({ environment: current, location, improveLocation: requestLocation, forgetLocation }), [current, location])
}
