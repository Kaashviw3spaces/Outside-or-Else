import { createContext } from 'react'
import type { ResolvedEnvironment } from './resolveEnvironment'
import type { Environment, TimeOfDayPhase } from '../lib/solar'
import type { LocationState } from '../lib/location'
import type { Appearance, ResolvedTheme } from './appearance'
export interface ThemeState {
  appearance: Appearance
  theme: ResolvedTheme
  phase: TimeOfDayPhase
  resolvedEnvironment: ResolvedEnvironment
  environment: Environment
  location: LocationState
  improveLocation: () => void
  forgetLocation: () => void
  storageAvailable: boolean
  setAppearance: (appearance: Appearance) => void
}
export const ThemeContext = createContext<ThemeState | null>(null)
