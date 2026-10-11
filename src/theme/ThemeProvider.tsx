import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { changeAppearance, getAppearance, getDeviceDark, subscribeAppearance, subscribeDeviceTheme } from './appearance'
import type { Appearance } from './appearance'
import { ThemeContext } from './ThemeContext'
import { useTimeOfDay } from '../hooks/useTimeOfDay'
import { applyTheme } from './applyTheme'
import { resolveEnvironment } from './resolveEnvironment'
export function ThemeProvider({ children }: { children: ReactNode }) {
  const appearance = useSyncExternalStore(subscribeAppearance, getAppearance, getAppearance)
  const deviceDark = useSyncExternalStore(subscribeDeviceTheme, getDeviceDark, () => false)
  const solar = useTimeOfDay(appearance === 'dynamic')
  const resolvedEnvironment = useMemo(() => resolveEnvironment(appearance, deviceDark, solar.environment.phase), [appearance, deviceDark, solar.environment.phase])
  const { theme, phase } = resolvedEnvironment
  const [storageAvailable, setStorageAvailable] = useState(true)
  const setAppearance = useCallback((next: Appearance) => { setStorageAvailable(changeAppearance(next)) }, [])
  useLayoutEffect(() => {
    applyTheme(appearance, theme, phase)
  }, [appearance, theme, phase])
  const value = useMemo(() => ({ appearance, theme, phase, resolvedEnvironment, setAppearance, storageAvailable, ...solar }), [appearance, theme, phase, resolvedEnvironment, setAppearance, storageAvailable, solar])
  return <ThemeContext.Provider value={value}><div className="theme-environment" data-theme-scope="" data-theme={theme} data-appearance={appearance} data-phase={phase}>{children}</div></ThemeContext.Provider>
}
