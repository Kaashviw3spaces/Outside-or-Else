import { resolveEnvironment } from './resolveEnvironment'
import type { TimeOfDayPhase } from '../lib/solar'
export type Appearance = 'light' | 'dark' | 'system' | 'dynamic'
export type ResolvedTheme = 'light' | 'dark'
// Kept separate from the pet save so existing companions need no migration.
export const APPEARANCE_KEY = 'outside-or-else:appearance'
export const DEVICE_THEME_QUERY = '(prefers-color-scheme: dark)'
export function parseAppearance(value: string | null): Appearance {
  return value === 'light' || value === 'dark' || value === 'dynamic' ? value : 'system'
}
export function loadAppearance(): Appearance {
  try { return parseAppearance(localStorage.getItem(APPEARANCE_KEY)) } catch { return 'system' }
}
export function resolveTheme(appearance: Appearance, deviceDark: boolean, phase: TimeOfDayPhase = 'afternoon'): ResolvedTheme {
  return resolveEnvironment(appearance, deviceDark, phase).theme
}
let appearance = loadAppearance()
const listeners = new Set<() => void>()
export function getAppearance() { return appearance }
export function changeAppearance(next: Appearance): boolean {
  appearance = next
  let saved = true
  try { localStorage.setItem(APPEARANCE_KEY, next) } catch { saved = false }
  listeners.forEach(listener => listener())
  return saved
}
export function subscribeAppearance(listener: () => void) {
  listeners.add(listener)
  function onStorage(event: StorageEvent) {
    if ((event.key === APPEARANCE_KEY || event.key === null) && event.storageArea === localStorage) {
      appearance = loadAppearance()
      listeners.forEach(notify => notify())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) }
}
export function getDeviceDark() { return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DEVICE_THEME_QUERY).matches }
export function subscribeDeviceTheme(listener: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(DEVICE_THEME_QUERY)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
