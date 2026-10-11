import { ACTIVITIES } from '../types/game'
import type { Profile, SaveData } from '../types/game'
import { normalizePet } from '../pets/save'
export const STORAGE_KEY = 'outside-or-else:v1'
export function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('profile' in data)) return null
    const p = data.profile as Partial<Profile> | null
    if (!p || typeof p.id !== 'string' || !['cat', 'dog'].includes(p.species ?? '') || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 24 || typeof p.outingTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p.outingTime) || ![5, 10, 15, 30].includes(p.duration ?? 0) || !Array.isArray(p.activities) || !p.activities.every(a => ACTIVITIES.includes(a)) || typeof p.affection !== 'number' || !Number.isFinite(p.affection) || p.affection < 0 || p.affection > 100 || typeof p.sound !== 'boolean' || typeof p.notifications !== 'boolean') return null
    // Lazy, non-destructive migration: reading never writes or changes the original record.
    return { ...p, pet: normalizePet(p as Profile) } as Profile
  } catch { return null }
}
export function saveProfile(profile: Profile): boolean {
  try {
    const data: SaveData = { version: 1, profile: { ...profile, pet: normalizePet(profile) } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch { return false }
}
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}
export function loveStage(love: number) {
  return love < 30 ? 'Shy' : love < 60 ? 'Curious' : love < 80 ? 'Affectionate' : 'Devoted'
}
