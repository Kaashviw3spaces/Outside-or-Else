import type { PersonalityId } from './catalog'
export const PERSONALITIES: Record<PersonalityId, {name: string; description: string; idleSeconds: number; blinkSeconds: number}> = {
  playful:{name:'Playful',description:'zoom first. remember plan never.',idleSeconds:3.4,blinkSeconds:5},
  sleepy:{name:'Sleepy',description:'nap inside another nap.',idleSeconds:5.5,blinkSeconds:7},
  curious:{name:'Curious',description:'nose questions. door investigations.',idleSeconds:4,blinkSeconds:5.5},
  shy:{name:'Shy',description:'small hello. big quiet affection.',idleSeconds:4.8,blinkSeconds:6.5},
  mischievous:{name:'Mischievous',description:'tiny paws. questionable plans.',idleSeconds:3.8,blinkSeconds:4.8},
}
export function getPersonality(id?: PersonalityId) { return PERSONALITIES[id ?? 'shy'] ?? PERSONALITIES.shy }
