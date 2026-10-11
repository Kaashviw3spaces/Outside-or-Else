import { validCoordinates } from './solar'
import type { Coordinates } from './solar'
import { isAndroid, PetLocation } from '../native/platform'
export const LOCATION_KEY = 'outside-or-else:approximate-location'
export interface LocationState {
  coordinates: Coordinates | null
  status: 'idle' | 'cached' | 'requesting' | 'ready' | 'denied' | 'unavailable'
  message: string | null
  settingsAvailable?: boolean
}
export function loadCoordinates(): Coordinates | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(LOCATION_KEY) ?? 'null')
    return validCoordinates(data) ? data : null
  } catch { return null }
}
const cached = loadCoordinates()
let state: LocationState = { coordinates: cached, status: cached ? 'cached' : 'idle', message: null }
const listeners = new Set<() => void>()
function publish(next: LocationState) { if (JSON.stringify(next) === JSON.stringify(state)) return; state = next; listeners.forEach(listener => listener()) }
export function getLocation() { return state }
export function subscribeLocation(listener: () => void) {
  listeners.add(listener)
  function onStorage(event: StorageEvent) {
    if (event.key === LOCATION_KEY || event.key === null) {
      const coordinates = loadCoordinates()
      publish({ coordinates, status: coordinates ? 'cached' : 'idle', message: null })
    }
  }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}
export function forgetLocation() {
  if (state.status === 'requesting') return
  let message: string | null = null
  try { localStorage.removeItem(LOCATION_KEY) } catch { message = 'Using local-time lighting for this session. Browser storage could not be cleared.' }
  publish({ coordinates: null, status: 'idle', message })
}
export function requestLocation() {
  if (state.status === 'requesting') return
  if (isAndroid()) {
    publish({ ...state, status: 'requesting', message: null, settingsAvailable: false })
    void PetLocation.current().then(result => {
      const raw = { ...result, obtainedAt: Date.now() }
      if (!validCoordinates(raw)) throw new Error('The location result wasn’t usable. Please retry.')
      const coordinates = { latitude: Math.round(raw.latitude * 100) / 100, longitude: Math.round(raw.longitude * 100) / 100, obtainedAt: raw.obtainedAt }
      let message: string | null = null
      try { localStorage.setItem(LOCATION_KEY, JSON.stringify(coordinates)) } catch { message = 'Location works for this session, but storage could not save it.' }
      publish({ coordinates, status: 'ready', message })
    }).catch((error: { code?: string; message?: string }) => {
      const denied = error.code === 'DENIED' || error.code === 'BLOCKED'
      publish({ ...state, status: denied ? 'denied' : 'unavailable', settingsAvailable: denied, message: error.message || 'Location couldn’t be requested. Please retry.' })
    })
    return
  }
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    publish({ ...state, status: 'unavailable', message: 'Location isn’t available in this browser. Saved-location or local-time lighting still works.' }); return
  }
  publish({ ...state, status: 'requesting', message: null })
  try {
    // This is the ONLY geolocation call, reached exclusively from the user's button.
    navigator.geolocation.getCurrentPosition(position => {
      const raw: Coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude, obtainedAt: Date.now() }
      if (!validCoordinates(raw)) { publish({ ...state, status: 'unavailable', message: 'The location result wasn’t usable. Please try again.' }); return }
      const coordinates: Coordinates = { latitude: Math.round(raw.latitude * 100) / 100, longitude: Math.round(raw.longitude * 100) / 100, obtainedAt: raw.obtainedAt }
      if (!validCoordinates(coordinates)) { publish({ ...state, status: 'unavailable', message: 'The location result wasn’t usable. Please try again.' }); return }
      let message: string | null = null
      try { localStorage.setItem(LOCATION_KEY, JSON.stringify(coordinates)) } catch { message = 'Location works for this session, but browser storage could not save it.' }
      publish({ coordinates, status: 'ready', message })
    }, error => {
      const denied = error.code === 1
      publish({ ...state, status: denied ? 'denied' : 'unavailable', message: denied ? 'Location permission wasn’t granted. You can continue without granting permission.' : error.code === 3 ? 'Location took too long. Try again when you’re ready.' : 'Location is unavailable right now. Local-time lighting still works.' })
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000 })
  } catch { publish({ ...state, status: 'unavailable', message: 'Location couldn’t be requested. Local-time lighting still works.' }) }
}

// Reuses the same permission flow; failures never silently substitute an old location.
export function openLocationSettings() {
  void PetLocation.openSettings().catch(() => publish({ ...state, message: 'Open Android Settings → Apps → Outside or Else! → Permissions → Location.' }))
}
export function requestAdventureLocation(): Promise<Coordinates | null> {
  if (state.status === 'requesting') return Promise.resolve(null)
  return new Promise(resolve => {
    const finish = () => { if (state.status === 'requesting') return; unsubscribe(); resolve(state.status === 'ready' ? state.coordinates : null) }
    const unsubscribe = subscribeLocation(finish)
    requestLocation()
    finish()
  })
}
