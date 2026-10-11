import type { Profile } from '../types/game'
import type { GroundedContext } from './grounding'
import type { ChatMessage } from './models'
import { buildGroundedPrompt } from './prompt'
export type TalkTurn = {user:string;assistant:string}
export function buildTalkPrompt(profile:Profile,context:GroundedContext,text:string,turns:readonly TalkTurn[]):ChatMessage[] {
  const base=buildGroundedPrompt(profile,context,text,'compact')
  // Only accepted AI turns; no deterministic facts, offline lines or rejected drafts.
  return [base[0],...turns.slice(-2).flatMap(t=>[
    {role:'user' as const,content:t.user.slice(0,300)},
    {role:'assistant' as const,content:t.assistant.slice(0,650)},
  ]),base[1]]
}
