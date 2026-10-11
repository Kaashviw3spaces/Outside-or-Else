import type { ReactNode } from 'react'
export function PetSpeechBubble({ children, sourceLabel }: { children: ReactNode; sourceLabel?: string }) {
  return <div className="speech-bubble" role="status" data-source-label={sourceLabel}>“{children}”</div>
}
