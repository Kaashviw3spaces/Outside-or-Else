import * as SunCalc from 'suncalc'
export type TimeOfDayPhase = 'sunrise' | 'morning' | 'afternoon' | 'golden-hour' | 'blue-hour' | 'night'
export interface Coordinates { latitude: number; longitude: number; obtainedAt: number }
export interface SolarEvents {
  dawn: Date | null; sunrise: Date | null; goldenHourEnd: Date | null
  solarNoon: Date; goldenHourStart: Date | null; sunset: Date | null; dusk: Date | null
  blueHour: { morningStart: Date | null; morningEnd: Date | null; eveningStart: Date | null; eveningEnd: Date | null }
  alwaysUp: boolean; alwaysDown: boolean
}
export interface Environment {
  phase: TimeOfDayPhase
  source: 'solar' | 'clock'
  events: SolarEvents | null
  note: string | null
  dayKey: string
  nextBoundary: number
}
export const PHASE_LABELS: Record<TimeOfDayPhase, string> = { sunrise: 'Sunrise', morning: 'Morning', afternoon: 'Afternoon', 'golden-hour': 'Golden hour', 'blue-hour': 'Blue hour', night: 'Night' }
export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false
  const c = value as Partial<Coordinates>
  return typeof c.latitude === 'number' && Number.isFinite(c.latitude) && Math.abs(c.latitude) <= 90 && typeof c.longitude === 'number' && Number.isFinite(c.longitude) && Math.abs(c.longitude) <= 180 && typeof c.obtainedAt === 'number' && Number.isFinite(c.obtainedAt) && c.obtainedAt >= 0
}
function validDate(value: Date | null): Date | null { return value && Number.isFinite(value.getTime()) ? value : null }
export function dayKey(date: Date) { return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}:${date.getTimezoneOffset()}` }
// One day's result only: avoids repeated astronomy work and an unbounded cache.
let cache: { key: string; events: SolarEvents } | null = null
export function calculateSolarEvents(date: Date, coordinates: Coordinates): SolarEvents {
  if (!validCoordinates(coordinates) || !Number.isFinite(date.getTime())) throw new RangeError('Invalid solar date or coordinates')
  const key = `${dayKey(date)}:${coordinates.latitude}:${coordinates.longitude}`
  if (cache?.key === key) return cache.events
  // SunCalc v2 accepts the device's civil-day UTC offset, including DST.
  const times = SunCalc.getTimes(date, coordinates.latitude, coordinates.longitude, 0, -date.getTimezoneOffset())
  const dawn = validDate(times.dawn), sunrise = validDate(times.sunrise), sunset = validDate(times.sunset), dusk = validDate(times.dusk)
  const events: SolarEvents = { dawn, sunrise, sunset, dusk, solarNoon: times.solarNoon, goldenHourEnd: validDate(times.goldenHourEnd), goldenHourStart: validDate(times.goldenHour), blueHour: { morningStart: dawn, morningEnd: sunrise, eveningStart: sunset, eveningEnd: dusk }, alwaysUp: !!times.alwaysUp, alwaysDown: !!times.alwaysDown }
  cache = { key, events }
  return events
}
// Explicitly approximate clock lighting; these are visual slots, NOT claimed solar times.
export function approximatePhase(date: Date): TimeOfDayPhase {
  const hour = date.getHours() + date.getMinutes() / 60
  return hour < 6 ? 'night' : hour < 8 ? 'sunrise' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 19 ? 'golden-hour' : hour < 20 ? 'blue-hour' : 'night'
}
export function phaseFromEvents(now: Date, events: SolarEvents, altitude: number): TimeOfDayPhase {
  const { dawn, goldenHourEnd, solarNoon, goldenHourStart, sunset, dusk } = events
  const boundaries = [dawn, goldenHourEnd, solarNoon, goldenHourStart, sunset, dusk]
  if (boundaries.every(d => d && Number.isFinite(d.getTime())) && boundaries.every((d, i) => i === 0 || d!.getTime() > boundaries[i - 1]!.getTime())) {
    const t = now.getTime()
    if (t < dawn!.getTime() || t >= dusk!.getTime()) return 'night'
    if (t < goldenHourEnd!.getTime()) return 'sunrise'
    if (t < solarNoon.getTime()) return 'morning'
    if (t < goldenHourStart!.getTime()) return 'afternoon'
    if (t < sunset!.getTime()) return 'golden-hour'
    return 'blue-hour'
  }
  // Missing crossings (polar day/night): actual solar altitude, never invented rise/set times.
  if (altitude < -6) return 'night'
  const rising = now.getTime() < solarNoon.getTime()
  if (altitude < -.833) return events.alwaysDown ? 'blue-hour' : rising ? 'sunrise' : 'blue-hour'
  if (altitude <= 6) return rising ? 'sunrise' : 'golden-hour'
  return rising ? 'morning' : 'afternoon'
}
export function getEnvironment(date: Date, coordinates: Coordinates | null): Environment {
  if (!Number.isFinite(date.getTime())) throw new RangeError('Invalid environment date')
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
  const key = dayKey(date)
  if (validCoordinates(coordinates)) {
    try {
      const events = calculateSolarEvents(date, coordinates)
      const altitude = SunCalc.getPosition(date, coordinates.latitude, coordinates.longitude).altitude
      if (!Number.isFinite(altitude) || !Number.isFinite(events.solarNoon.getTime())) throw new RangeError('Unavailable solar events')
      const future = [events.dawn, events.sunrise, events.goldenHourEnd, events.solarNoon, events.goldenHourStart, events.sunset, events.dusk].flatMap(d => d && d.getTime() > date.getTime() ? [d.getTime()] : [])
      return { phase: phaseFromEvents(date, events, altitude), source: 'solar', events, dayKey: key, nextBoundary: Math.min(midnight, ...future), note: events.alwaysUp ? 'The sun stays above the horizon today.' : events.alwaysDown ? 'The sun doesn’t rise today. Lighting follows its altitude.' : null }
    } catch { /* Fall back honestly if calculations cannot provide usable events. */ }
  }
  const boundaries = [6, 8, 12, 17, 19, 20].map(h => new Date(date.getFullYear(), date.getMonth(), date.getDate(), h).getTime()).filter(t => t > date.getTime())
  return { phase: approximatePhase(date), source: 'clock', events: null, dayKey: key, nextBoundary: Math.min(midnight, ...boundaries), note: 'Sky follows your clock.' }
}
