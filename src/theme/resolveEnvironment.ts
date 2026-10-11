import type { TimeOfDayPhase } from '../lib/solar'
import type { Appearance, ResolvedTheme } from './appearance'
export interface ResolvedEnvironment {
  theme: ResolvedTheme
  phase: TimeOfDayPhase
  visibility: { sun: number; moon: number; stars: number; fireflies: number; nightGlow: number }
}
export function resolveEnvironment(appearance: Appearance, deviceDark: boolean, solarPhase: TimeOfDayPhase): ResolvedEnvironment {
  // Manual modes decide BOTH palette and scenery; stale solar phases cannot override them.
  const phase = appearance === 'dynamic' ? solarPhase : appearance === 'dark' || (appearance === 'system' && deviceDark) ? 'night' : 'afternoon'
  const night = phase === 'night', twilight = phase === 'blue-hour'
  return {
    theme: night || twilight ? 'dark' : 'light', phase,
    visibility: { sun: night ? 0 : twilight ? .12 : 1, moon: night ? 1 : 0, stars: night ? 1 : twilight ? .65 : 0, fireflies: night ? 1 : 0, nightGlow: night ? 1 : twilight ? .65 : 0 },
  }
}
export const DEFAULT_ENVIRONMENT = resolveEnvironment('light', false, 'afternoon')
