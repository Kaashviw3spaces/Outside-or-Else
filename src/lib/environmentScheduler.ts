export interface ClockRuntime {
  now: () => number
  visible: () => boolean
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  cancel: (id: ReturnType<typeof setTimeout>) => void
  listen: (callback: () => void) => () => void
}
const browserRuntime: ClockRuntime = {
  now: () => Date.now(), visible: () => document.visibilityState !== 'hidden',
  schedule: (cb, delay) => setTimeout(cb, delay), cancel: id => clearTimeout(id),
  listen: cb => { document.addEventListener('visibilitychange', cb); window.addEventListener('pageshow', cb); return () => { document.removeEventListener('visibilitychange', cb); window.removeEventListener('pageshow', cb) } },
}
// One timeout, exact event/midnight wakeups, and a bounded clock-change/polar recheck.
export function startEnvironmentScheduler(refresh: () => number, runtime: ClockRuntime = browserRuntime) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let active = true
  function wake() {
    if (timer !== null) { runtime.cancel(timer); timer = null }
    if (!active || !runtime.visible()) return
    const nextBoundary = refresh()
    timer = runtime.schedule(wake, Math.max(250, Math.min(60000, nextBoundary - runtime.now() + 25)))
  }
  const unlisten = runtime.listen(wake)
  wake()
  return { wake, stop() { active = false; if (timer !== null) runtime.cancel(timer); timer = null; unlisten() } }
}
