import { isAndroid } from '../native/platform'
import { useEffect, useRef, useState } from 'react'
import type { Mood, Profile } from '../types/game'
import type { TimeOfDayPhase } from '../lib/solar'
import type { ChallengeState } from '../challenge/rules'
import type { Backend } from '../ai/models'
import { MEMORY_BUDGET_GIB, MODELS } from '../ai/models'
import { setChatMode, useChatMode } from '../ai/chatPreference'
import { inspectChatSupport, useTalkBrain } from '../ai/useTalkBrain'
import { aggregateProgress } from '../ai/downloadProgress'
import { readTalkContext } from '../ai/talkContext'
import { talkFactIntent, formatTalkFacts } from '../ai/talkFacts'
import { buildTalkPrompt } from '../ai/talkPrompt'
import type { TalkTurn } from '../ai/talkPrompt'
import { validateResponse } from '../ai/quality'
import { DialogueSession } from '../dialogue/index'
import { Icon } from './BottomNavigation'

type Source = 'user' | 'facts' | 'ai' | 'offline' | 'notice'
interface ConversationMessage { id:number; text:string; source:Source }
export function ConversationPanel({open,profile,mood,phase,challenge,onClose,onViewportChange,onPanelHeight}: {
  open:boolean;profile:Profile;mood:Mood;phase:TimeOfDayPhase;challenge:ChallengeState|null
  onClose:()=>void;onViewportChange:(height:number)=>void;onPanelHeight:(height:number)=>void
}) {
  const petName=profile.name, mode=useChatMode(), brain=useTalkBrain(mode==='ai')
  const panel=useRef<HTMLElement>(null),input=useRef<HTMLInputElement>(null),history=useRef<HTMLDivElement>(null)
  const [draft,setDraft]=useState(''),[messages,setMessages]=useState<ConversationMessage[]>([])
  const [working,setWorking]=useState(false),[notice,setNotice]=useState(''),[backend,setBackend]=useState<Backend>('webgpu')
  const [support,setSupport]=useState({gpu:false,cpu:false,detail:'Checking browser support; no model download.'})
  const sequence=useRef(0), request=useRef(0), lock=useRef(false), turns=useRef<TalkTurn[]>([]), dialogue=useRef(new DialogueSession())
  const busy=working || brain.status==='loading' || brain.status==='generating'
  const add=(source:Source,text:string)=>setMessages(previous=>[...previous,{id:sequence.current++,source,text}].slice(-40))
  function cancel() { request.current++;lock.current=false;setWorking(false);brain.stop();setNotice('Cancelled; tiny brain unloaded. Cached files may remain.');turns.current=[] }
  function close() { request.current++;lock.current=false;setWorking(false);onClose() }
  useEffect(()=>{
    const invalidate = () => { request.current++;lock.current=false;turns.current=[] }
    invalidate()
    const ticket=request.current
    void Promise.resolve().then(()=>{if(ticket===request.current)setWorking(false)})
    if(!open)return
    let current=true
    void inspectChatSupport().then(result=>{if(current)setSupport(result)})
    return ()=>{current=false;invalidate()}
  },[open,mode])
  useEffect(()=>{
    if(!open)return
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null
    const scene=panel.current?.closest('.home-screen'),viewport=window.visualViewport
    function resize() {
      const rect=panel.current?.closest('.game-main')?.getBoundingClientRect(),height=viewport?.height??window.innerHeight
      onViewportChange(rect && rect.bottom-height-(viewport?.offsetTop??0)>80?height:0)
      onPanelHeight(panel.current?.getBoundingClientRect().height??0)
    }
    resize();viewport?.addEventListener('resize',resize);viewport?.addEventListener('scroll',resize)
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null
    if(panel.current)observer?.observe(panel.current)
    input.current?.focus({preventScroll:true})
    return ()=>{
      observer?.disconnect();viewport?.removeEventListener('resize',resize);viewport?.removeEventListener('scroll',resize);onViewportChange(0);onPanelHeight(0)
      const target=opener?.isConnected&&opener!==document.body&&opener!==document.documentElement?opener:scene?.querySelector<HTMLButtonElement>('.pet-talk-orb')
      target?.focus({preventScroll:true})
    }
  },[open,onViewportChange,onPanelHeight])
  useEffect(()=>{
    if(!open)return
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();request.current++;lock.current=false;setWorking(false);onClose()}}
    window.addEventListener('keydown',escape);return ()=>window.removeEventListener('keydown',escape)
  },[open,onClose])
  useEffect(()=>{
    const scroller=history.current,last=scroller?.querySelector('.conversation-history')?.lastElementChild
    if(open&&scroller&&last)scroller.scrollTop+=last.getBoundingClientRect().bottom-scroller.getBoundingClientRect().bottom
  },[messages,open])
  useEffect(()=>{
    if(history.current&&['awaiting_confirmation','downloading','initializing','failed'].includes(brain.state))history.current.scrollTop=0
  },[brain.state])
  function changeMode(next:'offline'|'ai') { request.current++;lock.current=false;setWorking(false);turns.current=[];setChatMode(next);setNotice('');input.current?.focus({preventScroll:true}) }
  async function send() {
    const text=draft.trim().slice(0,500),intent=talkFactIntent(text)
    if(!text || lock.current || busy)return
    if(!intent && mode==='ai' && (brain.status!=='ready'||brain.model!=='qwen')){setNotice('Wake tiny brain, or explicitly switch to offline pet reactions.');return}
    lock.current=true;setWorking(true);setNotice('');const ticket=++request.current
    add('user',text);setDraft('')
    try {
      if(intent || mode==='ai') {
        let timeout:ReturnType<typeof setTimeout>|undefined
        const data=await Promise.race([readTalkContext(profile,phase,text,mood,intent==='rewards'||intent==='memories'),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Game-state read timed out. Please try again.')),10_000)})]).finally(()=>clearTimeout(timeout))
        if(ticket!==request.current)return
        if(intent){add('facts',formatTalkFacts(intent,data.context,profile,challenge,data.records));turns.current=[];return}
        const result=await brain.generate(buildTalkPrompt(profile,data.context,text,turns.current),data.context)
        if(ticket!==request.current)return
        if(result.accepted!==true || !validateResponse(result.text,data.context,text).valid) {
          add('notice','tiny brain went bonk. Its reply failed checks. No AI reply was accepted. Use silly offline replies instead?')
          turns.current=[];setNotice('AI reply rejected. Try again or explicitly switch to offline.');return
        }
        add('ai',result.text);turns.current=[...turns.current,{user:text,assistant:result.text}].slice(-2)
      } else add('offline',dialogue.current.next(profile.species,profile.pet?.personality,'talk',{affection:profile.affection,phase}))
    } catch(cause) {
      if(ticket===request.current){add('notice','No reply was substituted. Use offline pet reactions or try again.');setNotice(cause instanceof Error?cause.message:String(cause))}
    } finally { if(ticket===request.current){lock.current=false;setWorking(false);input.current?.focus({preventScroll:true})} }
  }
  const aggregate=aggregateProgress(brain.progress), current=brain.progress[brain.currentFile]
  const sleeping=mode==='ai' && (brain.status==='idle'||brain.status==='error')
  const labels:Record<Source,string>={user:'You',facts:'Game-state answer · not AI',ai:'AI chat · Qwen3-0.6B',offline:'Pet reactions — offline',notice:'Chat notice · not a pet reply'}
  return <section ref={panel} className="conversation-hud" hidden={!open} aria-labelledby="conversation-title" data-brain-state={brain.state}>
    <header className="conversation-heading"><h2 id="conversation-title">Talk to {petName}</h2><label className="sr-only" htmlFor="conversation-mode">Pet chat mode</label><select id="conversation-mode" value={mode} onChange={e=>changeMode(e.target.value==='ai'?'ai':'offline')}><option value="offline">Pet reactions</option><option value="ai">AI chat</option></select><button type="button" className="round-button" aria-label="Close conversation" onClick={close}><Icon name="close" /></button></header>
    <div className="conversation-scroll" ref={history}>
      {mode==='ai' && brain.model!=='qwen' && ['ready','downloading','initializing'].includes(brain.state) && <div className="brain-status"><p>AI Lab has a different brain awake. Let it sleep before waking Qwen here.</p><button type="button" onClick={cancel}>Unload Lab brain</button></div>}
      {mode==='ai' && brain.status==='ready' && brain.model==='qwen' && <p className="conversation-hint">{petName} is listening. AI chat is awake.</p>}
      {mode==='offline'  && <p className="conversation-hint">tiny pet noises. From the storybook. Offline.</p>}
      {sleeping && brain.state!=='awaiting_confirmation' && <div className="brain-status"><div><strong>{brain.error?'Oops. Tiny brain got tangled.':`${petName}’s tiny brain is sleeping.`}</strong><p>{brain.error?'You can try again, or keep things cozy offline.':'Wake it when you feel like a chat.'}</p></div><button type="button" id="talk-wake" onClick={()=>{turns.current=[];setNotice('');brain.confirm()}}>{brain.error?'Retry':'Wake tiny brain'}</button>{brain.error&&<button type="button" className="chat-offline" onClick={()=>changeMode('offline')}>Use offline reactions</button>}</div>}
      {mode==='ai' && brain.state==='awaiting_confirmation' && !isAndroid() && <div className="brain-consent"><strong>A little room for a tiny brain</strong><p id="talk-memory">Qwen3-0.6B needs about {backend==='webgpu'?'570':'919'} MB of weights + about 37 MB tokenizer/runtime. The first download needs internet. Plan for {MEMORY_BUDGET_GIB.qwen[backend]} GiB additional working memory{backend==='webgpu'?' across RAM/GPU':' in RAM'}; this estimate is not a guarantee. Some browsers and devices are unsupported.</p><p>Text stays on this device. File downloads contact Hugging Face and runtime hosts. AI can invent facts. Loading includes one warm-up token. Cached files can be evicted by the browser.</p><label htmlFor="talk-backend">Device for this download</label><select id="talk-backend" value={backend} onChange={e=>setBackend(e.target.value==='wasm'?'wasm':'webgpu')}><option value="webgpu">WebGPU · q4f16</option><option value="wasm">CPU / WASM · q4 · slower, more RAM</option></select><p>{support.detail}</p><div className="brain-actions"><button type="button" id="talk-confirm" aria-describedby="talk-memory" disabled={backend==='webgpu'?!support.gpu:!support.cpu} onClick={()=>void brain.load(backend)}>Download &amp; wake</button><button type="button" onClick={()=>brain.stop('Confirmation dismissed; no download requested')}>Maybe later</button></div></div>}
      {mode==='ai' && brain.state==='awaiting_confirmation' && isAndroid() && <div className="brain-consent"><strong>A little room for tiny thoughts</strong><p>Your companion’s brain is included in this app. Chat works without internet. Waking it uses phone memory; replies may take a moment and can be imperfect.</p><button type="button" id="talk-confirm" onClick={()=>void brain.load('wasm')}>Wake companion</button><button type="button" onClick={()=>brain.stop()}>Maybe later</button></div>}{brain.status==='loading' && <div className="brain-progress" role="status"><strong>Waking up {petName}’s tiny brain…</strong><p>{brain.state==='initializing'?'tiny thoughts. big saucepan.':'gathering brain crumbs...'}</p>{brain.state==='downloading' && <><progress max="100" {...(aggregate.percent===null?{}:{value:aggregate.percent})} aria-label="Progress of reported files" /><p>{aggregate.percent===null?'Size still being discovered.':`${aggregate.percent.toFixed(0)}% of reported files · ${(aggregate.loaded/1e6).toFixed(1)} / ${(aggregate.total/1e6).toFixed(1)} MB`}</p></>}{current && <p className="brain-file">{brain.currentFile}: {(current.loaded/1e6).toFixed(1)} MB{current.total>0?` / ${(current.total/1e6).toFixed(1)} MB`:' · total unknown'}{current.status==='done'?' · file read complete':''}</p>}<button type="button" className="chat-cancel" onClick={cancel}>{isAndroid()?'Cancel waking':'Cancel download'}</button></div>}
      <div className="conversation-history" role="log" aria-label="Your recent messages and replies" aria-live="polite">{messages.map(m=><div className={m.source==='user'?'user-speech-bubble':`pet-chat-bubble source-${m.source}`} data-response-source={m.source} key={m.id}><span className={m.source==='user'?'sr-only':'chat-source'}>{labels[m.source]}: </span><p>{m.text}</p></div>)}</div>
      {working && brain.status!=='loading' && <div className="pet-thinking" role="status"><span /><span /><span /><small>{brain.status==='generating'?'tiny brain is cooking...':'sniffing the storybook...'}</small></div>}
      {(notice||brain.error) && <p className="conversation-notice" role={brain.error?'alert':'status'}>{brain.error?'Tiny brain couldn’t wake. Open technical details below for the reason.':notice}</p>}
      {working && <button type="button" className="chat-cancel" onClick={cancel}>Cancel reply / unload</button>}
      {mode==='ai' && notice.includes('rejected') && <button type="button" className="chat-offline" onClick={()=>changeMode('offline')}>Use offline reactions</button>}
      <details className="brain-about"><summary>{brain.error?'About AI · view technical details':'About AI'}</summary><p>{isAndroid()?'Chat stays on this phone and works without internet. Replies can be imperfect. Let your companion’s brain sleep to free phone memory. Saved-fact answers and storybook reactions are separate from AI.':'AI chat is optional and imperfect. Pet reactions and game-state answers are never AI. Closing Talk, changing screens, or backgrounding keeps a requested load alive; cancel or switch to offline to unload. Browser reloads end the session. Completed cached files stay when you cancel.'}</p>{brain.status==='ready'&&<button type="button" onClick={cancel}>Let tiny brain sleep / unload</button>}
      {!isAndroid() && <details className="brain-diagnostics"><summary>Technical details</summary><pre>{JSON.stringify({model:MODELS[brain.model].repo,revision:MODELS[brain.model].revision,quantization:brain.backend==='webgpu'?'q4f16':'q4',backend:brain.backend,state:brain.state,generating:brain.generating,currentFile:brain.currentFile,files:brain.progress,reportedFiles:aggregate,loadMs:brain.loadMs,errorType:brain.errorType,error:brain.error,events:brain.diagnostics},null,2)}</pre></details>}</details>
    </div>
    <form className="conversation-compose" onSubmit={e=>{e.preventDefault();void send()}}><label className="sr-only" htmlFor="conversation-input">Message to {petName}</label><input ref={input} id="conversation-input" value={draft} maxLength={500} placeholder={`A little word for ${petName}…`} autoComplete="off" onChange={e=>setDraft(e.target.value)} /><button type="submit" className="round-button" aria-label="Send message" disabled={busy||!draft.trim()||(!talkFactIntent(draft)&&mode==='ai'&&(brain.status!=='ready'||brain.model!=='qwen'))}><Icon name="arrow" /></button></form>
    <span className="sr-only">Conversation stays in this room session. AI is optional and imperfect; offline reactions and game-state answers are not AI.</span>
  </section>
}
