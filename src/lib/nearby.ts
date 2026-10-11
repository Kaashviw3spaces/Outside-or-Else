import type { Activity } from '../types/game'
import { validCoordinates } from './solar'
import type { Coordinates } from './solar'
import { isAndroid, nativePostJSON } from '../native/platform'
export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'
export const NEARBY_KEY = 'outside-or-else:nearby-v1'
export const SEARCH_RADIUS = 2000
export const CACHE_TTL = 6 * 60 * 60 * 1000
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000
export type PlaceCategory = 'Park' | 'Garden' | 'Walking area' | 'Viewpoint' | 'Outdoor landmark' | 'Café'
export interface Place { id: string; name: string; category: PlaceCategory; latitude: number; longitude: number; tags: Record<string, string> }
export interface NearbyCache { version: 1; coordinates: Coordinates; timestamp: number; radius: number; places: Place[] }
export function roundCoordinates(c: Coordinates): Coordinates { return { latitude: Math.round(c.latitude * 100) / 100, longitude: Math.round(c.longitude * 100) / 100, obtainedAt: c.obtainedAt } }
export function distanceMeters(a: Pick<Coordinates, 'latitude' | 'longitude'>, b: Pick<Coordinates, 'latitude' | 'longitude'>) {
  const radians = (value: number) => value * Math.PI / 180
  const deltaLat = radians(b.latitude - a.latitude), deltaLon = radians(b.longitude - a.longitude)
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(deltaLon / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}
export function categoryFor(tags: Record<string, string>): PlaceCategory | null {
  if (tags.leisure === 'park') return 'Park'
  if (tags.leisure === 'garden') return 'Garden'
  if (tags.highway === 'pedestrian') return 'Walking area'
  if (tags.tourism === 'viewpoint') return 'Viewpoint'
  if (['monument', 'memorial', 'ruins'].includes(tags.historic)) return 'Outdoor landmark'
  if (tags.amenity === 'cafe') return 'Café'
  return null
}
function accessible(tags: Record<string, string>) { return !['private', 'no', 'customers', 'permit', 'members'].includes(tags.access) && !['private', 'no', 'customers', 'permit', 'members'].includes(tags.foot) && tags.indoor !== 'yes' && tags.disused !== 'yes' }
export function parsePlaces(data: unknown, origin: Coordinates): Place[] {
  if (!data || typeof data !== 'object' || !('elements' in data) || !Array.isArray(data.elements)) throw new Error('The place service returned an invalid response. Please try again later.')
  if ('remark' in data && data.remark) throw new Error('The place service could not finish this search. Please try again later.')
  const places: Place[] = [], ids = new Set<string>()
  for (const raw of data.elements as unknown[]) {
    if (!raw || typeof raw !== 'object') continue
    const e = raw as { type?: unknown; id?: unknown; lat?: unknown; lon?: unknown; center?: { lat?: unknown; lon?: unknown }; tags?: unknown }
    if (!['node', 'way', 'relation'].includes(String(e.type)) || typeof e.id !== 'number' || !Number.isSafeInteger(e.id) || e.id <= 0 || !e.tags || typeof e.tags !== 'object') continue
    const tags = Object.fromEntries(Object.entries(e.tags).filter((pair): pair is [string, string] => typeof pair[1] === 'string'))
    const category = categoryFor(tags), name = tags.name?.trim(), latitude = e.lat ?? e.center?.lat, longitude = e.lon ?? e.center?.lon
    const point = { latitude, longitude, obtainedAt: 0 }
    if (!name || !category || !accessible(tags) || !validCoordinates(point) || distanceMeters(origin, point) > SEARCH_RADIUS) continue
    const place: Place = { id: `${e.type}/${e.id}`, name, category, latitude: point.latitude, longitude: point.longitude, tags }
    const normalized = name.toLocaleLowerCase().replace(/\s+/g, ' ')
    if (ids.has(place.id) || places.some(p => p.category === category && p.name.toLocaleLowerCase().replace(/\s+/g, ' ') === normalized && distanceMeters(p, place) < 80)) continue
    ids.add(place.id); places.push(place)
  }
  return places
}
const activityTypes: Record<Activity, PlaceCategory[]> = {
  Walking: ['Park', 'Walking area', 'Garden'], 'Sitting in a park': ['Park', 'Garden'], Exploring: ['Outdoor landmark', 'Viewpoint', 'Walking area'],
  'Reading outdoors': ['Garden', 'Park'], 'Visiting a cafe': ['Café'], 'Watching sunsets': ['Viewpoint', 'Park'],
}
export function rankPlaces(places: Place[], origin: Coordinates, activities: readonly Activity[]) {
  return places.filter(p => p.category !== 'Café' || activities.includes('Visiting a cafe')).map(place => {
    const distance = distanceMeters(origin, place)
    const matches = activities.filter(a => activityTypes[a].includes(place.category))
    const score = matches.length * 4 + (place.tags.access === 'yes' || place.tags.access === 'public' ? .5 : 0) + (place.tags.website ? .1 : 0) - distance / 1000
    return { ...place, distance, score, suggestedActivity: matches[0] ?? (place.category === 'Viewpoint' || place.category === 'Outdoor landmark' ? 'Exploring' : 'Walking') }
  }).sort((a, b) => b.score - a.score || a.distance - b.distance || a.id.localeCompare(b.id))
}
export function describePlace(place: Place) {
  const descriptions: Record<PlaceCategory, string> = { Park: 'Mapped as a park in OpenStreetMap.', Garden: 'Mapped as a garden in OpenStreetMap.', 'Walking area': 'A named pedestrian area mapped in OpenStreetMap.', Viewpoint: 'Mapped as a viewpoint in OpenStreetMap.', 'Outdoor landmark': `Mapped as a ${place.tags.historic ?? 'landmark'} in OpenStreetMap.`, Café: 'Mapped as a café in OpenStreetMap.' }
  return descriptions[place.category] + (place.tags.access === 'yes' || place.tags.access === 'public' ? ' Access is tagged as public.' : '') + (place.tags.fee === 'yes' ? ' A fee is tagged.' : '')
}
export function formatDistance(distance: number) { return distance < 1000 ? `${Math.round(distance / 10) * 10} m` : `${(distance / 1000).toFixed(1)} km` }
export function directionsUrl(place: Place) { return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}&travelmode=walking` }
export function isStale(cache: NearbyCache, now = Date.now()) { return now - cache.timestamp >= CACHE_TTL }
export function loadNearbyCache(now = Date.now()): NearbyCache | null {
  try {
    const data = JSON.parse(localStorage.getItem(NEARBY_KEY) ?? 'null') as NearbyCache | null
    if (!data || data.version !== 1 || !validCoordinates(data.coordinates) || data.radius !== SEARCH_RADIUS || !Number.isFinite(data.timestamp) || data.timestamp > now || now - data.timestamp > MAX_CACHE_AGE || !Array.isArray(data.places) || data.places.length > 10000) return null
    if (JSON.stringify(roundCoordinates(data.coordinates)) !== JSON.stringify(data.coordinates)) return null
    for (const p of data.places) {
      if (!p || !/^(node|way|relation)\/[1-9]\d*$/.test(p.id) || typeof p.name !== 'string' || !p.name.trim() || !validCoordinates({ ...p, obtainedAt: 0 }) || !p.tags || typeof p.tags !== 'object' || !Object.values(p.tags).every(v => typeof v === 'string') || categoryFor(p.tags) !== p.category || !accessible(p.tags) || distanceMeters(data.coordinates, p) > SEARCH_RADIUS) return null
    }
    return data
  } catch { return null }
}
export function saveNearbyCache(cache: NearbyCache) { try { localStorage.setItem(NEARBY_KEY, JSON.stringify(cache)); return true } catch { return false } }
export function clearNearbyCache() { try { localStorage.removeItem(NEARBY_KEY); return true } catch { return false } }
export function buildNearbyQuery(origin: Coordinates) {
  if (!validCoordinates(origin)) throw new Error('A usable location is needed to search nearby.')
  const c = roundCoordinates(origin), around = `(around:${SEARCH_RADIUS},${c.latitude},${c.longitude})`
  return `[out:json][timeout:20];(nwr${around}[leisure~"^(park|garden)$"];nwr${around}[highway=pedestrian];nwr${around}[tourism=viewpoint];nwr${around}[historic~"^(monument|memorial|ruins)$"];nwr${around}[amenity=cafe];);out center tags;`
}
let pending: Promise<NearbyCache> | null = null
let nextRequestAt = 0
async function fetchPlaces(query:string, signal:AbortSignal) {
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`
  if (!isAndroid()) return fetch(url, { headers:{Accept:'application/json'}, signal, credentials:'omit', referrerPolicy:'no-referrer' })
  let onAbort:()=>void = ()=>{}
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error('Nearby request aborted.'))
    signal.addEventListener('abort', onAbort, {once:true})
    if(signal.aborted) onAbort()
  })
  try {
    const response = await Promise.race([nativePostJSON(OVERPASS_URL, `data=${encodeURIComponent(query)}`), aborted])
    return {status:response.status, ok:response.status>=200&&response.status<300, json:async():Promise<unknown>=>typeof response.data==='string'?JSON.parse(response.data):response.data}
  } finally { signal.removeEventListener('abort', onAbort) }
}
export async function searchNearby(origin: Coordinates, force = false): Promise<{ cache: NearbyCache; cached: boolean; saved: boolean }> {
  const coordinates = roundCoordinates(origin), existing = loadNearbyCache()
  const sameArea = existing?.coordinates.latitude === coordinates.latitude && existing.coordinates.longitude === coordinates.longitude
  if (!force && sameArea && existing && !isStale(existing)) return { cache: existing, cached: true, saved: true }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('You’re offline. Saved places are available below, if present. Reconnect to search again.')
  if (pending) throw new Error('A nearby search is already running. Please wait for it to finish.')
  if (Date.now() < nextRequestAt) throw new Error(`Please wait ${Math.ceil((nextRequestAt - Date.now()) / 1000)} seconds before another search.`)
  nextRequestAt = Date.now() + 60000
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 25000)
  pending = (async () => {
    try {
      const response = await fetchPlaces(buildNearbyQuery(coordinates), controller.signal)
      if (response.status === 429) { nextRequestAt = Date.now() + 120000; throw new Error('The place service is busy (rate limit). Please wait two minutes before trying again.') }
      if (!response.ok) throw new Error('The place service is unavailable right now. Please try again later.')
      const places = parsePlaces(await response.json(), coordinates)
      return { version: 1, coordinates, radius: SEARCH_RADIUS, timestamp: Date.now(), places }
    } catch (error) {
      if (controller.signal.aborted) throw new Error('The nearby search timed out. Please try again later.', { cause: error })
      if (error instanceof TypeError || (isAndroid() && !(error instanceof Error))) throw new Error('Couldn’t reach the place service. Check your connection and try again later.', { cause: error })
      throw error
    } finally { clearTimeout(timeout) }
  })()
  try { const cache = await pending; return { cache, cached: false, saved: saveNearbyCache(cache) } } finally { pending = null }
}
