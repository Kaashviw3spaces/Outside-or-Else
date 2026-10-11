import { Suspense, lazy, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { isAndroid } from '../native/platform'
const AILab = lazy(() => import('./AILab'))
const snapshot = () => !isAndroid() && location.hash === '#ai-lab'
function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
export default function ExperimentalEntry({ children }: { children: ReactNode }) {
  const lab = useSyncExternalStore(subscribe, snapshot, () => false)
  return lab ? <Suspense fallback={<p>Opening local AI experiment…</p>}><AILab /></Suspense> : children
}
