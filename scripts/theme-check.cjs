// Theme checks without added dependencies. Browser-only behavior is mocked explicitly.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 }, fileName: filename }).outputText, filename)
const values = new Map([['outside-or-else:v1', 'existing pet save']])
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
global.localStorage = storage
const events = new Map()
const mediaEvents = new Set()
const query = { matches: false, addEventListener: (_type, cb) => mediaEvents.add(cb), removeEventListener: (_type, cb) => mediaEvents.delete(cb) }
global.window = { addEventListener: (type, cb) => events.set(type, cb), removeEventListener: (type, cb) => { if (events.get(type) === cb) events.delete(type) }, matchMedia: () => query }
const theme = require('../src/theme/appearance.ts')
assert.equal(theme.getAppearance(), 'system')
for (const mode of ['light', 'dark', 'system']) for (const deviceDark of [false, true]) assert.equal(theme.resolveTheme(mode, deviceDark), mode === 'system' ? (deviceDark ? 'dark' : 'light') : mode)
for (const invalid of [null, '', 'sepia', 'DARK', '{broken']) assert.equal(theme.parseAppearance(invalid), 'system')
let changes = 0
const unsubscribe = theme.subscribeAppearance(() => changes++)
for (const mode of ['light', 'dark', 'system', 'dynamic']) {
  assert.equal(theme.changeAppearance(mode), true)
  assert.equal(theme.getAppearance(), mode)
  assert.equal(theme.loadAppearance(), mode)
}
assert.equal(changes, 4)
assert.equal(values.get('outside-or-else:v1'), 'existing pet save')
values.set(theme.APPEARANCE_KEY, 'dark')
events.get('storage')({ key: theme.APPEARANCE_KEY, storageArea: storage })
assert.equal(theme.getAppearance(), 'dark')
values.delete(theme.APPEARANCE_KEY)
events.get('storage')({ key: null, storageArea: storage })
assert.equal(theme.getAppearance(), 'system')
const count = changes
unsubscribe(); theme.changeAppearance('dark'); assert.equal(changes, count)
let deviceChanges = 0
const unsubscribeDevice = theme.subscribeDeviceTheme(() => deviceChanges++)
for (const dark of [true, false]) { query.matches = dark; mediaEvents.forEach(cb => cb()); assert.equal(theme.getDeviceDark(), dark); assert.equal(theme.resolveTheme('system', theme.getDeviceDark()), dark ? 'dark' : 'light') }
assert.equal(deviceChanges, 2)
unsubscribeDevice(); assert.equal(mediaEvents.size, 0)
// Simulate a fresh module load after refreshing.
delete require.cache[require.resolve('../src/theme/appearance.ts')]
assert.equal(require('../src/theme/appearance.ts').getAppearance(), 'dark')
global.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } }
assert.equal(theme.loadAppearance(), 'system')
assert.equal(theme.changeAppearance('light'), false)
assert.equal(theme.getAppearance(), 'light')
global.localStorage = storage
// Verify the pre-paint bootstrap matches the shared resolver for every choice/device combination.
const html = fs.readFileSync('index.html', 'utf8')
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1]
for (const saved of [null, 'light', 'dark', 'system', 'dynamic', 'invalid']) for (const dark of [false, true]) {
  const doc = { documentElement: { dataset: {} }, querySelector: () => ({ setAttribute: () => {} }) }
  vm.runInNewContext(bootstrap, { localStorage: { getItem: () => saved }, document: doc, window: { matchMedia: () => ({ matches: dark }) } })
  assert.equal(doc.documentElement.dataset.theme, theme.resolveTheme(theme.parseAppearance(saved), dark, require('../src/lib/solar.ts').approximatePhase(new Date())))
}
const { ThemeProvider } = require('../src/theme/ThemeProvider.tsx')
const { useTheme } = require('../src/theme/useTheme.ts')
function Probe() { const value = useTheme(); return React.createElement('span', { 'data-theme': value.theme, 'data-appearance': value.appearance }) }
const profile = { id: 'test', species: 'cat', name: 'Miso', activities: ['Walking'], outingTime: '17:30', duration: 10, affection: 10, sound: false, notifications: false }
const activeStore = require('../src/theme/appearance.ts')
for (const mode of ['light', 'dark']) {
  activeStore.changeAppearance(mode)
  const wrap = child => renderToStaticMarkup(React.createElement(ThemeProvider, null, child))
  assert.ok(wrap(React.createElement(Probe)).includes(`data-theme="${mode}"`))
  for (const name of ['Home', 'Adventure', 'Memories', 'Settings', 'Onboarding']) {
    const Component = require(`../src/screens/${name}.tsx`)[name]
    const rendered = wrap(React.createElement(Component, { profile, onSave: () => true, onAdventure() {}, onComplete() {} }))
    assert.ok(rendered.length > 1000)
    if (name === 'Settings') assert.ok([...rendered.matchAll(/<input[^>]+>/g)].some(([input]) => input.includes(`value="${mode}"`) && input.includes('checked=""')))
    if (name === 'Home') assert.ok(rendered.includes('aria-valuenow="10"'))
  }
  const { SplashScreen } = require('../src/components/SplashScreen.tsx')
  assert.ok(wrap(React.createElement(SplashScreen, { onDone() {} })).includes('splash-sky'))
}
// Palette checks catch missing variables, cycles, and unreadable text on themed cards.
const themeCss = fs.readFileSync('src/styles/theme.css', 'utf8')
const mainCss = fs.readFileSync('src/index.css', 'utf8')
const sceneCss = fs.readFileSync('src/styles/scenes.css', 'utf8')
const definitions = new Set([...(themeCss + mainCss + sceneCss).matchAll(/--([\w-]+):/g)].map(m => m[1]))
for (const match of (mainCss + sceneCss).matchAll(/var\(--([\w-]+)\)/g)) assert.ok(definitions.has(match[1]), `Undefined token ${match[1]}`)
assert.equal(/--([\w-]+):\s*var\(--\1\)/.test(mainCss + sceneCss + themeCss), false)
assert.equal(/#[0-9a-f]{3,8}/i.test(mainCss + sceneCss), false)
const lightTokens = Object.fromEntries([...themeCss.match(/:root[^\{]*\{([\s\S]*?)\n\}/)[1].matchAll(/--([\w-]+): (#[0-9a-f]+)/g)].map(m => [m[1], m[2]]))
const darkTokens = Object.fromEntries([...themeCss.match(/:root\[data-theme='dark'\][^\{]*\{([\s\S]*?)\n\}/)[1].matchAll(/--([\w-]+): (#[0-9a-f]+)/g)].map(m => [m[1], m[2]]))
function luminance(hex) { const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return values[0] * .2126 + values[1] * .7152 + values[2] * .0722 }
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
for (const [mode, tokens] of [['day', lightTokens], ['night', darkTokens]]) {
  for (const [ink, surface] of [['ink', 'canvas'], ['muted', 'surface'], ['subtle', 'paper'], ['sage-ink', 'sage-surface'], ['accent-ink', 'accent'], ['ink', 'peach'], ['ink', 'feed-surface'], ['ink', 'adventure-surface']]) assert.ok(contrast(tokens[ink], tokens[surface]) >= 4.5, `${mode}: ${ink} on ${surface} contrast ${contrast(tokens[ink], tokens[surface])}`)
}
console.log('PASS: all appearance/device combinations, immediate store notifications, persistence/reload, cross-tab updates, subscription cleanup, unavailable storage, pre-paint bootstrap, all screen renders, unchanged affection, complete tokens and text contrast.')
console.log('These are automated checks; live browser visuals/interactions still need a browser.')
