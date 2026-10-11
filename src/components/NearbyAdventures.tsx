import { PetLine } from './PetLine'
import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../types/game'
import { getLocation, openLocationSettings, requestAdventureLocation } from '../lib/location'
import { getEnvironment } from '../lib/solar'
import type { Coordinates } from '../lib/solar'
import { clearNearbyCache, describePlace, directionsUrl, formatDistance, isStale, loadNearbyCache, rankPlaces, searchNearby } from '../lib/nearby'
import type { Place } from '../lib/nearby'
import type { NearbyCache } from '../lib/nearby'
import { Icon } from './BottomNavigation'
function SolarSuggestion({ cache, now, sunsetPreference, profile }: { cache: NearbyCache; now: number; sunsetPreference: boolean; profile: Profile }) {
  const date = new Date(now)
  const current = getEnvironment(date, cache.coordinates)
  let events = current.events, tomorrow = false
  if (events?.sunset && events.sunset.getTime() <= now) { date.setDate(date.getDate() + 1); events = getEnvironment(date, cache.coordinates).events; tomorrow = true }
  const time = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return <aside className="solar-suggestion"><strong>{tomorrow ? 'Tomorrow’s' : 'Today’s'} sky, near your search area</strong>{events?.goldenHourStart && events.sunset ? <p>{events.goldenHourStart.getTime() > now ? `Golden hour begins around ${time(events.goldenHourStart)}.` : 'Golden hour is underway.'} Sunset around {time(events.sunset)}.{sunsetPreference ? ' Consider a sunset outing at a listed viewpoint or park.' : ''}</p> : <p>{events?.alwaysUp ? 'The sun stays above the horizon today.' : events?.alwaysDown ? 'The sun does not rise today.' : 'Sunset times are unavailable for this day.'}</p>}{(current.phase === 'blue-hour' || !!events?.goldenHourStart) && <p><PetLine species={profile.species} personality={profile.pet?.personality} event={current.phase === 'blue-hour' ? 'blue_hour' : 'golden_hour'} context={`${cache.timestamp}:${tomorrow}`} /></p>}<small>Solar estimates, not place opening hours. Check access, weather, and actual opening times before going.</small></aside>
}
export function NearbyAdventures({ profile, now, onChoose, startDisabled=false }: { profile: Profile; now: number; onChoose?: (place:Place)=>void; startDisabled?:boolean }) {
  const [cache, setCache] = useState<NearbyCache | null>(loadNearbyCache)
  const [status, setStatus] = useState<'idle' | 'locating' | 'searching' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [limit, setLimit] = useState(12)
  const busy = useRef(false), mounted = useRef(true), lastOrigin = useRef<Coordinates | null>(null)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const places = cache ? rankPlaces(cache.places, cache.coordinates, profile.activities) : []
  const stale = cache ? isStale(cache, now) : false
  async function find(useSavedArea = false) {
    if (busy.current) return
    busy.current = true; setMessage(''); setStatus(useSavedArea ? 'searching' : 'locating')
    try {
      const origin = useSavedArea ? lastOrigin.current ?? cache?.coordinates : await requestAdventureLocation()
      if (!mounted.current) return
      if (!origin) throw new Error(getLocation().message ?? 'Location is already being requested. Please try again once it finishes.')
      lastOrigin.current = origin
      setStatus('searching')
      const result = await searchNearby(origin, useSavedArea)
      if (!mounted.current) return
      setCache(result.cache); setStatus('success'); setLimit(12)
      setMessage(result.cached ? 'Using a saved search from the last six hours.' : result.saved ? 'Nearby places found. Saved on this device.' : 'Nearby places found, but browser storage could not save them.')
    } catch (error) {
      if (mounted.current) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Search could not finish. Please try again.') }
    } finally { busy.current = false }
  }
  function forget() {
    if (!clearNearbyCache()) { setMessage('Browser storage could not clear saved places. Try clearing this site’s data in your browser.'); return }
    setCache(null); lastOrigin.current = null; setStatus('idle'); setMessage('Saved places cleared. Your solar location can be forgotten separately in Settings.')
  }
  const loading = status === 'locating' || status === 'searching'
  return <section className="nearby-section" aria-labelledby="nearby-title"><div className="section-heading"><h2 id="nearby-title">sniffing distance</h2><Icon name="adventure" /></div><p>map needs approximate dirt address. location optional.</p><p className="nearby-explanation">Find real parks, gardens, pedestrian areas, viewpoints and landmarks within about 2 km. Café suggestions follow your preferences.</p><p className="nearby-privacy">Location is requested only when you tap below. Searching sends coordinates rounded to two decimal places to the external Overpass place-data service. One search is saved on this device; there are no accounts or location analytics.</p><button type="button" className="primary-button" aria-label="Find adventures near me" disabled={loading} onClick={() => void find()}>{status === 'locating' ? 'Finding your location…' : status === 'searching' ? 'sniffing the map...' : 'sniff near me'}<Icon name="leaf" /></button><div className="nearby-status" role={status === 'error' ? 'alert' : 'status'} aria-live="polite">{message || (status === 'locating' ? 'Allow location in your browser to find nearby places.' : status === 'searching' ? 'Asking OpenStreetMap for real places…' : 'Your location stays optional. No search runs on page load.')}</div>{status === 'error' && <button type="button" className="text-button" disabled={loading} onClick={() => void find(!!lastOrigin.current)}>Try again</button>}
    {cache && <div className="nearby-results" aria-busy={loading}><div className="cache-notice"><strong>{stale ? 'Older saved results — refresh recommended' : 'Saved search results'}</strong><p>Search area: {cache.coordinates.latitude.toFixed(2)}, {cache.coordinates.longitude.toFixed(2)} · 2 km radius</p><p>Updated {new Date(cache.timestamp).toLocaleString()}. {status === 'error' ? 'These are from the previous successful search.' : ''}</p><small>Distances are straight-line estimates from the approximate search point, not your exact position or walking routes. Rounding can shift the search point by about 800 m.</small><div className="cache-actions"><button type="button" className="text-button" disabled={loading} onClick={() => void find(true)}>Refresh this search area</button><button type="button" className="text-button" disabled={loading} onClick={forget}>Clear saved places</button></div></div><SolarSuggestion cache={cache} now={now} sunsetPreference={profile.activities.includes('Watching sunsets')} profile={profile} />{!places.length ? <div className="nearby-empty"><h2>No matching named places found</h2><p>OpenStreetMap coverage varies. Try another area, or add cafés to your preferences. No places have been invented.</p></div> : <><p className="nearby-count">{places.length} real {places.length === 1 ? 'place' : 'places'} · ordered by your activities and distance</p><div className="nearby-list">{places.slice(0, limit).map(place => <article className="nearby-card" key={place.id}><span className="eyebrow">{place.category}</span><h3>{place.name}</h3><p className="place-distance">Approximately {formatDistance(place.distance)} away (straight-line)</p><p>{describePlace(place)}</p>{(place.category === 'Park' || place.category === 'Café' || place.category === 'Viewpoint') && <p><PetLine species={profile.species} personality={profile.pet?.personality} event={place.category === 'Park' ? 'nearby_park' : place.category === 'Café' ? 'nearby_cafe' : 'nearby_viewpoint'} context={place.id} /></p>}<p className="suggested-activity">Try: {place.suggestedActivity}</p>{place.tags.opening_hours && <p>OSM opening-hours tag: <span>{place.tags.opening_hours}</span> (not verified)</p>}<div className="place-links">{onChoose&&<button type="button" className="choose-nearby text-button" disabled={startDisabled} onClick={()=>onChoose(place)} aria-label={`Start outing at ${place.name}`}>investigate this spot</button>}<a className="directions-button" href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open directions<Icon name="arrow" /></a><a className="osm-link" href={`https://www.openstreetmap.org/${place.id}`} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">View OSM details</a></div></article>)}</div>{limit < places.length && <button type="button" className="text-button" onClick={() => setLimit(limit + 12)}>Show more places</button>}</>}<p className="nearby-attribution">Place data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> (ODbL), via Overpass. Map directions open Google Maps and send the destination coordinates. Area centers may not be entrances; access and opening times can change.</p></div>}
    {status === 'error' && getLocation().settingsAvailable && <button type="button" className="text-button" onClick={openLocationSettings}>Open Android app settings</button>}
  </section>
}
