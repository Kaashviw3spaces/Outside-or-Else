import { useContext, useSyncExternalStore } from 'react'
import { ThemeContext } from '../theme/ThemeContext'
import { getEnvironment } from '../lib/solar'
import { startEnvironmentScheduler } from '../lib/environmentScheduler'
// Dialogue clock is independent of the chosen palette; manual Day/Night stays untouched.
let environment = getEnvironment(new Date(), null)
const listeners = new Set<() => void>()
let scheduler: ReturnType<typeof startEnvironmentScheduler> | null = null
function refresh() {
  const next = getEnvironment(new Date(), null)
  const changed = environment.phase !== next.phase
  environment = next
  if (changed) listeners.forEach(listener => listener())
  return next.nextBoundary
}
function wakeOnFocus() { scheduler?.wake() }
function subscribe(listener: () => void) {
  listeners.add(listener)
  if (!scheduler) { scheduler = startEnvironmentScheduler(refresh); window.addEventListener('focus', wakeOnFocus) }
  return () => { listeners.delete(listener); if (!listeners.size) { scheduler?.stop(); scheduler = null; window.removeEventListener('focus', wakeOnFocus) } }
}
const snapshot = () => environment.phase
const noSubscribe = () => () => {}
export function useDialoguePhase(enabled = true) {
  const theme = useContext(ThemeContext)
  const clock = useSyncExternalStore(enabled ? subscribe : noSubscribe, snapshot, snapshot)
  return theme?.appearance === 'dynamic' ? theme.environment.phase : clock
}
