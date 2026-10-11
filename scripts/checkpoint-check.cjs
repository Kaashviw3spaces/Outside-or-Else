// No test dependencies: exercise storage and render real components with React's server renderer.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
      fileName: filename,
    })
    module._compile(output.outputText, filename)
  }
}
const { normalizePet } = require('../src/pets/save.ts')
const { loadProfile, saveProfile, STORAGE_KEY, loveStage, formatTime } = require('../src/lib/storage.ts')
const values = new Map()
global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
const profile = { id: 'test-pet', species: 'cat', name: 'Miso', activities: ['Walking', 'Reading outdoors'], outingTime: '17:30', duration: 10, affection: 10, sound: false, notifications: false }
assert.equal(loadProfile(), null)
assert.equal(saveProfile(profile), true)
assert.deepEqual(loadProfile(), { ...profile, pet: normalizePet(profile) })
const updated = { ...profile, name: 'Maple', species: 'dog', outingTime: '08:15', duration: 30, sound: true, notifications: true }
assert.equal(saveProfile(updated), true)
assert.deepEqual(loadProfile(), { ...updated, pet: normalizePet(updated) })
for (const corrupt of ['{broken', JSON.stringify({ version: 99, profile }), JSON.stringify({ version: 1, profile: { ...profile, affection: 101 } }), JSON.stringify({ version: 1, profile: { ...profile, outingTime: '25:00' } }), JSON.stringify({ version: 1, profile: { ...profile, activities: ['Invented'] } }), JSON.stringify({ version: 1, profile: null })]) {
  values.set(STORAGE_KEY, corrupt)
  assert.equal(loadProfile(), null)
}
global.localStorage = { getItem() { throw Error('blocked') }, setItem() { throw Error('quota') } }
assert.equal(loadProfile(), null)
assert.equal(saveProfile(profile), false)
assert.deepEqual([0, 29, 30, 59, 60, 79, 80, 100].map(loveStage), ['Shy', 'Shy', 'Curious', 'Curious', 'Affectionate', 'Affectionate', 'Devoted', 'Devoted'])
assert.equal(formatTime('00:05'), '12:05 AM')
assert.equal(formatTime('12:00'), '12:00 PM')
assert.equal(formatTime('17:30'), '5:30 PM')
const { PetCharacter } = require('../src/components/PetCharacter.tsx')
for (const species of ['cat', 'dog']) {
  for (const mood of ['idle', 'happy', 'excited', 'sleepy', 'sad', 'annoyed']) {
    const html = renderToStaticMarkup(React.createElement(PetCharacter, { species, mood, affectionLevel: 10, size: 'large' }))
    assert.ok(html.includes(`mood-${mood}`))
    assert.ok(html.includes('pet-head'))
    assert.ok(html.includes('pet-body'))
    assert.ok(html.includes('pet-tail'))
  }
  for (const reaction of ['petting', 'feeding']) {
    const html = renderToStaticMarkup(React.createElement(PetCharacter, { species, mood: 'happy', reaction, affectionLevel: 10, size: 'large' }))
    assert.ok(html.includes(reaction === 'petting' ? 'floating-heart' : 'food-bowl'))
  }
  const { Home } = require('../src/screens/Home.tsx')
  const html = renderToStaticMarkup(React.createElement(Home, { profile: { ...profile, species }, onAdventure() {} }))
  assert.ok(html.includes('aria-valuenow="10"'))
  assert.ok(html.includes('Pet Miso. Tap or gently swipe.'))
  assert.ok(html.includes('cozy-room'))
}
const { ThemeProvider } = require('../src/theme/ThemeProvider.tsx')
for (const screen of ['Adventure', 'Memories', 'Settings']) {
  const Component = require(`../src/screens/${screen}.tsx`)[screen]
  const html = renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(Component, { profile, onSave: () => true })))
  assert.ok(html.length > 1000)
  if (screen === 'Adventure') assert.ok(html.includes('Find adventures near me') && html.includes('No search runs on page load.'))
  if (screen === 'Memories') assert.ok(html.includes('opening brain folder') && html.includes('feed brain folder') && html.includes('Add or resume a memory'))
  if (screen === 'Settings') assert.ok(html.includes('settings-time'))
}
const { Onboarding } = require('../src/screens/Onboarding.tsx')
assert.ok(renderToStaticMarkup(React.createElement(Onboarding, { onComplete() {} })).includes('Choose a companion'))
const { BottomNavigation } = require('../src/components/BottomNavigation.tsx')
for (const page of ['home', 'adventure', 'memories', 'settings']) {
  const html = renderToStaticMarkup(React.createElement(BottomNavigation, { page, onChange() {} }))
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1)
}
console.log('PASS: profile persistence, corrupt/blocked storage, affection boundaries, time formatting, both pets in six moods and two reactions, all screens, and four navigation states.')
console.log('Browser interaction and visual checks still require a real browser.')
