import type { PetDetails } from '../pets/save'
import type { OutdoorProgress } from '../journey/types'
export type Species = 'cat' | 'dog'
export type Mood = 'idle' | 'happy' | 'excited' | 'sleepy' | 'sad' | 'annoyed'
export type Reaction = 'petting' | 'feeding' | null
export type Page = 'home' | 'adventure' | 'memories' | 'settings'
export const ACTIVITIES = ['Walking', 'Sitting in a park', 'Exploring', 'Reading outdoors', 'Visiting a cafe', 'Watching sunsets'] as const
export type Activity = typeof ACTIVITIES[number]
export type Duration = 5 | 10 | 15 | 30
export interface Profile {
  id: string
  species: Species
  name: string
  activities: Activity[]
  outingTime: string
  duration: Duration
  affection: number
  sound: boolean
  notifications: boolean
  pet?: PetDetails
  outdoor?: OutdoorProgress
}
export interface Memory {
  id: string
  photo: string
  date: string
  locationLabel: string
  aiCaption: string | null
  petId: string
}
export interface SaveData { version: 1; profile: Profile }
