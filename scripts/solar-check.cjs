// Deterministic solar, location, scheduling and Dynamic integration checks; no test dependencies.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
process.env.TZ = 'UTC'
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 }, fileName: filename }).outputText, filename)
const values = new Map([['outside-or-else:v1', 'existing companion']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
global.localStorage = storage
const events = new Map()
global.window = { addEventListener: (name, cb) => events.set(name, cb), removeEventListener: (name, cb) => { if (events.get(name) === cb) events.delete(name) }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) }
let geoCalls = 0, success, failure, geoOptions
Object.defineProperty(global, 'navigator', { configurable: true, value: { geolocation: { getCurrentPosition(ok, fail, options) { geoCalls++; success = ok; failure = fail; geoOptions = options } } } })
const solar = require('../src/lib/solar.ts')
const clockDate = new Date('2026-03-20T12:00:00Z')
const coords = { latitude: 51.51, longitude: -.13, obtainedAt: clockDate.getTime() }
assert.equal(clockDate.getTimezoneOffset(), 0)
for (const [hour, phase] of [[0, 'night'], [5, 'night'], [6, 'sunrise'], [8, 'morning'], [12, 'afternoon'], [17, 'golden-hour'], [19, 'blue-hour'], [20, 'night'], [23, 'night']]) {
  const date = new Date(2026, 2, 20, hour)
  const env = solar.getEnvironment(date, null)
  assert.equal(env.phase, phase); assert.equal(env.source, 'clock'); assert.equal(env.events, null)
  assert.ok(env.nextBoundary > date.getTime())
}
const eventsToday = solar.calculateSolarEvents(clockDate, coords)
for (const [event, phase] of [['dawn', 'sunrise'], ['goldenHourEnd', 'morning'], ['solarNoon', 'afternoon'], ['goldenHourStart', 'golden-hour'], ['sunset', 'blue-hour'], ['dusk', 'night']]) {
  assert.ok(eventsToday[event] instanceof Date)
  assert.equal(solar.getEnvironment(eventsToday[event], coords).phase, phase, event)
}
assert.equal(solar.getEnvironment(new Date(eventsToday.dawn.getTime() - 1), coords).phase, 'night')
assert.equal(solar.getEnvironment(new Date(eventsToday.sunset.getTime() - 1), coords).phase, 'golden-hour')
assert.equal(eventsToday.blueHour.eveningEnd.getTime(), eventsToday.dusk.getTime())
assert.equal(solar.calculateSolarEvents(new Date('2026-03-20T13:00:00Z'), coords), eventsToday)
const june = solar.calculateSolarEvents(new Date('2026-06-21T12:00:00Z'), coords)
const december = solar.calculateSolarEvents(new Date('2026-12-21T12:00:00Z'), coords)
assert.ok(Math.abs(june.sunrise.getTime() % 86400000 - december.sunrise.getTime() % 86400000) > 3600000)
const elsewhere = solar.calculateSolarEvents(clockDate, { ...coords, latitude: 28.61, longitude: 77.21 })
assert.notEqual(eventsToday.sunrise.getTime(), elsewhere.sunrise.getTime())
assert.notEqual(eventsToday.sunset.getTime(), elsewhere.sunset.getTime())
const polar = { ...coords, latitude: 78.22, longitude: 15.65 }
const polarSummer = solar.getEnvironment(new Date('2026-06-21T12:00:00Z'), polar)
assert.equal(polarSummer.source, 'solar'); assert.equal(polarSummer.events.alwaysUp, true); assert.equal(polarSummer.events.sunset, null)
assert.ok(['morning', 'afternoon', 'golden-hour', 'sunrise'].includes(polarSummer.phase))
const polarWinter = solar.getEnvironment(new Date('2026-12-21T00:00:00Z'), polar)
assert.equal(polarWinter.events.alwaysDown, true); assert.equal(polarWinter.events.sunrise, null); assert.equal(polarWinter.phase, 'night')
for (const invalid of [null, { ...coords, latitude: 91 }, { ...coords, longitude: -181 }, { ...coords, latitude: NaN }, { ...coords, obtainedAt: -1 }, { ...coords, longitude: '10' }]) assert.equal(solar.getEnvironment(clockDate, invalid).source, 'clock')
assert.throws(() => solar.calculateSolarEvents(new Date('bad'), coords), RangeError)
assert.throws(() => solar.getEnvironment(new Date('bad'), coords), RangeError)
process.env.TZ = 'Asia/Kolkata'
const ist = solar.getEnvironment(new Date('2026-03-20T20:00:00Z'), coords)
assert.ok(ist.dayKey.startsWith('2026-2-21:')); assert.ok(ist.dayKey.endsWith('-330'))
process.env.TZ = 'America/New_York'
assert.notEqual(solar.dayKey(new Date('2026-03-07T12:00:00Z')).split(':')[1], solar.dayKey(new Date('2026-03-09T12:00:00Z')).split(':')[1])
process.env.TZ = 'UTC'
const location = require('../src/lib/location.ts')
assert.equal(geoCalls, 0); assert.equal(location.getLocation().coordinates, null)
location.requestLocation(); location.requestLocation(); assert.equal(geoCalls, 1)
assert.equal(location.getLocation().status, 'requesting'); assert.equal(geoOptions.enableHighAccuracy, false); assert.equal(geoOptions.timeout, 15000)
success({ coords: { latitude: 51.5074, longitude: -.1278 } })
assert.equal(location.getLocation().coordinates.latitude, 51.51); assert.equal(location.getLocation().coordinates.longitude, -.13)
assert.equal(location.loadCoordinates().latitude, 51.51)
assert.equal(values.get('outside-or-else:v1'), 'existing companion')
// Cached coordinates support offline solar computation without any network or permission call.
const beforeOffline = geoCalls
global.fetch = () => { throw Error('Unexpected network request') }
assert.equal(solar.getEnvironment(clockDate, location.loadCoordinates()).source, 'solar')
assert.equal(geoCalls, beforeOffline)
location.requestLocation(); failure({ code: 1 })
assert.equal(location.getLocation().status, 'denied'); assert.ok(location.getLocation().coordinates)
location.requestLocation(); failure({ code: 2 }); assert.equal(location.getLocation().status, 'unavailable')
location.requestLocation(); failure({ code: 3 }); assert.ok(location.getLocation().message.includes('too long'))
location.requestLocation(); success({ coords: { latitude: Infinity, longitude: 0 } }); assert.equal(location.getLocation().status, 'unavailable')
location.requestLocation(); success({ coords: { latitude: 90.001, longitude: 0 } }); assert.equal(location.getLocation().status, 'unavailable')
const cachedCoords = location.loadCoordinates()
delete require.cache[require.resolve('../src/lib/location.ts')]
const reloadedLocation = require('../src/lib/location.ts')
assert.deepEqual(reloadedLocation.getLocation().coordinates, cachedCoords); assert.equal(reloadedLocation.getLocation().status, 'cached')
reloadedLocation.forgetLocation(); assert.equal(reloadedLocation.getLocation().coordinates, null); assert.equal(storage.getItem(location.LOCATION_KEY), null)
for (const malformed of ['{bad', JSON.stringify({ ...coords, latitude: 900 }), 'null']) { values.set(location.LOCATION_KEY, malformed); assert.equal(location.loadCoordinates(), null) }
values.delete(location.LOCATION_KEY)
global.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } }
assert.equal(location.loadCoordinates(), null)
reloadedLocation.requestLocation(); success({ coords: { latitude: 28.61, longitude: 77.21 } })
assert.ok(reloadedLocation.getLocation().coordinates); assert.ok(reloadedLocation.getLocation().message.includes('could not save'))
global.localStorage = storage
// One timer only, boundary/midnight wakeups, hidden-page pause, clock jumps, and cleanup.
const { startEnvironmentScheduler } = require('../src/lib/environmentScheduler.ts')
let now = 1000, visible = true, serial = 0, refreshes = 0, wakeEvent = null, boundary = 1800
const timers = new Map()
const runtime = { now: () => now, visible: () => visible, schedule: (cb, delay) => { const id = ++serial; timers.set(id, { cb, delay }); return id }, cancel: id => timers.delete(id), listen: cb => { wakeEvent = cb; return () => { wakeEvent = null } } }
const scheduler = startEnvironmentScheduler(() => { refreshes++; return boundary }, runtime)
assert.equal(refreshes, 1); assert.equal(timers.size, 1); assert.equal([...timers.values()][0].delay, 825)
scheduler.wake(); assert.equal(timers.size, 1); assert.equal(refreshes, 2)
visible = false; wakeEvent(); assert.equal(timers.size, 0)
now += 86400000; boundary = now + 120000; visible = true; wakeEvent(); assert.equal(refreshes, 3); assert.equal([...timers.values()][0].delay, 60000)
const tick = [...timers.values()][0].cb; timers.clear(); now += 60000; tick(); assert.equal(timers.size, 1); assert.equal(refreshes, 4)
boundary = now - 1000; scheduler.wake(); assert.equal([...timers.values()][0].delay, 250)
const lateTick = [...timers.values()][0].cb
scheduler.stop(); assert.equal(timers.size, 0); assert.equal(wakeEvent, null)
lateTick(); assert.equal(timers.size, 0); assert.equal(refreshes, 5)
const appearance = require('../src/theme/appearance.ts')
for (const mode of ['light', 'dark', 'system', 'dynamic']) { assert.equal(appearance.changeAppearance(mode), true); assert.equal(appearance.loadAppearance(), mode) }
for (const phase of ['sunrise', 'morning', 'afternoon', 'golden-hour', 'blue-hour', 'night']) for (const deviceDark of [false, true]) {
  assert.equal(appearance.resolveTheme('dynamic', deviceDark, phase), ['blue-hour', 'night'].includes(phase) ? 'dark' : 'light')
  assert.equal(appearance.resolveTheme('light', deviceDark, phase), 'light'); assert.equal(appearance.resolveTheme('dark', deviceDark, phase), 'dark'); assert.equal(appearance.resolveTheme('system', deviceDark, phase), deviceDark ? 'dark' : 'light')
}
assert.equal(appearance.parseAppearance('dynamic'), 'dynamic')
// Clock-only pre-paint bootstrap agrees with the fallback at every phase.
const bootstrap = fs.readFileSync('index.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
for (const hour of [0, 6, 8, 12, 17, 19, 20]) {
  const instant = new Date(2026, 2, 20, hour).getTime()
  const doc = { documentElement: { dataset: {} }, querySelector: () => ({ setAttribute() {} }) }
  class FixedDate extends Date { constructor() { super(instant) } }
  vm.runInNewContext(bootstrap, { Date: FixedDate, document: doc, localStorage: { getItem: () => 'dynamic' }, window: { matchMedia: () => ({ matches: true }) } })
  assert.equal(doc.documentElement.dataset.phase, solar.approximatePhase(new Date(instant)))
  assert.equal(doc.documentElement.dataset.theme, appearance.resolveTheme('dynamic', true, doc.documentElement.dataset.phase))
}
const { ThemeProvider } = require('../src/theme/ThemeProvider.tsx')
const { Settings } = require('../src/screens/Settings.tsx')
const profile = { id: 'test', species: 'dog', name: 'Maple', activities: ['Walking'], outingTime: '17:30', duration: 10, affection: 10, sound: false, notifications: false }
const beforeRender = geoCalls
for (const mode of ['light', 'dark', 'system', 'dynamic']) {
  appearance.changeAppearance(mode)
  const html = renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(Settings, { profile, onSave: () => true })))
  assert.ok(html.includes('Dynamic — Follow the Sun'))
  if (mode === 'dynamic') assert.ok(html.includes('Your room follows the sky.'))
}
assert.equal(geoCalls, beforeRender)
console.log('PASS: six phases and boundaries, real date/location changes, polar day/night, invalid inputs, timezone/DST/date rollover, opt-in-only geolocation, rounding/cache/offline/denied/unavailable/timeout/storage failure, all four modes, Dynamic settings render, one-timer scheduling, visibility/clock jumps and cleanup.')
