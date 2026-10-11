import { useSyncExternalStore } from 'react'
import { brainSession } from './brainSession'
export type ChatMode = 'offline' | 'ai'
export const CHAT_MODE_KEY = 'outside-or-else:pet-chat-mode:v1'
let sessionMode: ChatMode | undefined
const listeners = new Set<() => void>()
export function getChatMode(): ChatMode {
  if (sessionMode) return sessionMode
  try { return localStorage.getItem(CHAT_MODE_KEY) === 'ai' ? 'ai' : 'offline' } catch { return 'offline' }
}
export function setChatMode(mode: ChatMode): boolean {
  sessionMode = mode
  let saved = false
  try { localStorage.setItem(CHAT_MODE_KEY, mode); sessionMode = undefined; saved = true } catch { /* Session preference only. */ }
  if (mode === 'offline') brainSession.stop('Explicit switch to offline reactions')
  listeners.forEach(listener => listener())
  return saved
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  const changed = (event: StorageEvent) => { if (event.key === CHAT_MODE_KEY || event.key === null) { sessionMode = undefined; if (getChatMode() === 'offline') brainSession.stop('Offline preference changed in another tab'); listener() } }
  window.addEventListener('storage', changed)
  return () => { listeners.delete(listener); window.removeEventListener('storage', changed) }
}
export function useChatMode() { return useSyncExternalStore(subscribe, getChatMode, () => 'offline' as const) }
