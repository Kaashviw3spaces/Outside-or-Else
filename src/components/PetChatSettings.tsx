import { useState } from 'react'
import { setChatMode, useChatMode } from '../ai/chatPreference'
import { isAndroid } from '../native/platform'
export function PetChatSettings() {
  const mode = useChatMode(), [notice,setNotice] = useState('')
  return <div className="settings-section"><label htmlFor="pet-chat-mode">PET CHAT MODE</label><select id="pet-chat-mode" value={mode} onChange={e=>setNotice(setChatMode(e.target.value === 'ai' ? 'ai' : 'offline') ? 'Chat preference saved.' : 'Chat preference set for this session; storage unavailable.')}><option value="offline">Offline pet reactions</option><option value="ai">Real AI (when supported)</option></select><p>{isAndroid()?'Your companion’s brain is included in the app and works without internet. Wake it inside Talk when you want a chat. Replies can be imperfect.':'Real AI is optional and imperfect. Choosing it never downloads a model; confirm “wake tiny brain” inside Talk first.'}</p>{notice && <p role="status">{notice}</p>}</div>
}
