import type { Breed } from './catalog'
export function earPaths(ears: Breed['ears'], cat: boolean): [string,string] {
  if (ears === 'floppy') return ['M85 92Q46 83 49 136q4 42 29 40l18-60Z','M207 92q41-9 42 44-4 42-30 40l-17-60Z']
  if (ears === 'rounded') return ['M76 112Q55 46 89 49q27 0 40 40Z','M172 89q18-40 42-40 34-1 12 63Z']
  if (ears === 'large') return ['M77 117 67 31q1-16 16-8l48 67Z','M170 88 217 23q16-9 16 9l-8 85Z']
  return cat ? ['M77 117 77 48Q78 36 88 45l43 45','M171 88 212 44q11-8 12 5l-1 70'] : ['M77 112 76 52q0-15 15-7l36 42','m174 86 34-41q13-10 15 5l1 63']
}
