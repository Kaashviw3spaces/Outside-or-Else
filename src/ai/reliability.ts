import type { Attempt, ChatMessage } from './models'
import type { GroundedContext } from './grounding'
import { retryPrompt } from './prompt'
import { validateResponse } from './quality'

export async function runValidatedGeneration(messages: ChatMessage[], context: GroundedContext, generate: (messages: ChatMessage[]) => Promise<Omit<Attempt, 'quality'>>) {
  const attempts: Attempt[] = [], demos = messages.filter(m => m.role === 'assistant').map(m => m.content)
  let next = messages
  for (let index = 0; index < 2; index++) {
    const result = await generate(next)
    const quality = validateResponse(result.text, context, messages.at(-1)!.content, demos)
    attempts.push({ ...result, quality })
    if (quality.valid) break
    next = retryPrompt(messages, quality.reasons)
  }
  return { accepted: attempts.at(-1)!.quality.valid, attempts, retryReasons: attempts.length > 1 ? attempts[0].quality.reasons : [] }
}
