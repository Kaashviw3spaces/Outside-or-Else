import type { Appearance, ResolvedTheme } from './appearance'
import type { TimeOfDayPhase } from '../lib/solar'
export function applyTheme(appearance: Appearance, theme: ResolvedTheme, phase: TimeOfDayPhase) {
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.appearance = appearance
  document.documentElement.dataset.phase = phase
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#18243D' : '#FFF4E6')
}
