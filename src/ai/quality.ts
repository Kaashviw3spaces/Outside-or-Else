import type { GroundedContext } from './grounding'

export type QualityReason = 'empty' | 'too-long' | 'repetition' | 'wrong-species' | 'demo-copy' | 'unsupported-history' | 'generic-assistant' | 'pressure'
export type Quality = { valid: boolean; reasons: QualityReason[] }
export function validateResponse(text: string, context: GroundedContext, question: string, demos: readonly string[] = []): Quality {
  const reasons: QualityReason[] = [], lower = text.toLowerCase(), words = lower.match(/[\p{L}\p{N}]+/gu) ?? []
  if (!text.trim()) reasons.push('empty')
  if (text.length > 650 || words.length > 95) reasons.push('too-long')
  const triples = words.slice(2).map((_, i) => words.slice(i, i + 3).join(' '))
  const sounds = lower.match(/\b(?:meow(?:s|ed|ing)?|mrrp|mrow|prrr|purr(?:s|ed|ing)?|woof(?:s|ed|ing)?|bork(?:s|ed|ing)?|bark(?:s|ed|ing)?)\b/g) ?? []
  if (triples.some(t => triples.filter(x => x === t).length >= 3) || /(\b\w+\b)(?:[\s,!?.]+\1){3,}/i.test(text) || sounds.length >= 4) reasons.push('repetition')
  const species = context.species.status === 'KNOWN' ? context.species.value : null
  if ((species === 'cat' && /\b(woof(?:s|ed|ing)?|bork(?:s|ed|ing)?|bark(?:s|ed|ing)?|arf|ruff)\b/i.test(text)) || (species === 'dog' && /\b(meow(?:s|ed|ing)?|mrrp|mrow|emwoe|prrr|skrrrt|purr(?:s|ed|ing)?|hiss(?:es|ed|ing)?)\b/i.test(text))) reasons.push('wrong-species')
  const normalized = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  if (demos.some(d => {
    const parts = normalized(d).split(' '), response = normalized(text)
    return parts.slice(5).some((_, i) => response.includes(parts.slice(i, i + 6).join(' ')))
  })) reasons.push('demo-copy')
  if (/\b(as an? (ai|assistant|language model)|how can i (help|assist)|i'?m here to (help|assist)|is there anything else|provide assistance|let me know (if|what|when|how)|i can be happy to help)\b/i.test(text)) reasons.push('generic-assistant')
  // Deliberately conservative: history belongs in the deterministic data panel,
  // even when a retrieved record could support it. This is not a truth oracle.
  if (/\b(remember when|(?:i|we) (went|visited|walked|saw|found|chased|took|earned)|we had|you (went|visited|took|earned)|our (last|previous) (trip|walk|adventure)|yesterday|last (week|month|year))\b/i.test(text)
    || /\b\d{4}-\d{2}-\d{2}\b/.test(text)
    || /\b(photo|picture)\b.{0,35}\b(proves?|verified|shows?)\b/i.test(text)
    || /\b(?:we|you|our|your)\b.{0,50}\b(?:photos?|pictures?)\b.{0,30}\b(anymore|lost|deleted|gone)\b/i.test(text)) reasons.push('unsupported-history')
  const vulnerable = /\b(tired|sad|overwhelmed|exhausted)\b|(?:don'?t|do not|not|no)\b.{0,35}\b(outside|walk|go out)\b|\b(stay(?:ing)? (inside|indoors|home)|rather stay|need a break|sit quietly)\b/i.test(question)
  if (vulnerable && /\b(must|should|need to|have to|come on|let'?s|lets|get up|go outside|go out|walk now|lazy|disappoint|guilt)\b/i.test(text)) reasons.push('pressure')
  return { valid: reasons.length === 0, reasons }
}
