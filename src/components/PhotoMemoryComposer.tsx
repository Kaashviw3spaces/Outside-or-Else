import { dialogueOptions, pickDialogue } from '../dialogue/index'
import { PetLine } from './PetLine'
import { useEffect, useRef, useState } from 'react'
import type { Profile } from '../types/game'
import type { Outing, PhotoRecord } from '../journey/types'
import { attachPhoto, beginPhotoPreparation, editDraft, finishMemory } from '../journey/service'
import { preparePhoto } from '../journey/photos'
import { storageMessage } from '../journey/database'
import { MemoryPhoto } from './MemoryPhoto'
import { Icon } from './BottomNavigation'
import { isAndroid } from '../native/platform'
import { captureAndroidPhoto } from '../native/camera'
export function PhotoMemoryComposer({profile,outing,onSaved}:{profile:Profile;outing:Outing;onSaved:(record:Outing)=>void}) {
  const [record,setRecord]=useState(outing),[caption,setCaption]=useState(outing.caption),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[pending,setPending]=useState<Omit<PhotoRecord,'id'|'createdAt'>|null>(null)
  const [petLine, setPetLine] = useState('')
  const [speechEvent, setSpeechEvent] = useState<'photo-saved' | 'photo_error'>('photo-saved')
  const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null),working=useRef(false),alive=useRef(true)
  useEffect(()=>{alive.current=true;return ()=>{alive.current=false}},[])
  useEffect(()=>{if(!busy&&!pending&&caption===record.caption)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=''};window.addEventListener('beforeunload',warn);return ()=>window.removeEventListener('beforeunload',warn)},[busy,pending,caption,record.caption])
  useEffect(()=>{
    if(caption===record.caption||busy)return
    const timer=setTimeout(()=>{void editDraft(profile,record.id,caption).then(next=>{if(alive.current)setRecord(next)}).catch(e=>{if(alive.current)setMessage(storageMessage(e))})},600)
    return ()=>clearTimeout(timer)
  },[caption,record.id,record.caption,busy,profile])
  async function storePhoto(photo:Omit<PhotoRecord,'id'|'createdAt'>){setPending(photo);const next=await attachPhoto(profile,record.id,photo);if(alive.current){setRecord(next);setPending(null);setMessage('Photo saved on this device. Nothing was uploaded.');setSpeechEvent('photo-saved');setPetLine(pickDialogue(dialogueOptions(record.pet.species, record.pet.appearance.personality, 'photo_saved')))}}
  async function choose(file?:File){if(!file||working.current)return;working.current=true;setBusy(true);setPetLine('');setMessage('Preparing your photo. Keep this tab open until it is saved.');try{const next=await beginPhotoPreparation(profile,record.id);if(alive.current)setRecord(next);await storePhoto(await preparePhoto(file))}catch(e){if(alive.current){setMessage(storageMessage(e));setSpeechEvent('photo_error');setPetLine(pickDialogue(dialogueOptions(record.pet.species, record.pet.appearance.personality, 'photo_error')))}}finally{working.current=false;if(alive.current)setBusy(false)}}
  async function save(){if(working.current||pending)return;working.current=true;setBusy(true);setMessage('Saving your memory…');try{const result=await finishMemory(profile,record.id,caption);if(alive.current)onSaved(result)}catch(e){if(alive.current)setMessage(storageMessage(e))}finally{working.current=false;if(alive.current)setBusy(false)}}
  async function takePhoto(){
    if(!isAndroid()){camera.current?.click();return}
    if(working.current)return
    working.current=true;setBusy(true);setMessage('Opening your phone camera?')
    try {
      const file=await captureAndroidPhoto()
      working.current=false
      if(!alive.current)return
      if(file)await choose(file)
      else setMessage('Camera cancelled. Your earlier photo and caption are kept.')
    } catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'Camera could not open. Please retry or choose an existing photo.')}
    finally{working.current=false;if(alive.current)setBusy(false)}
  }
  return <section className="photo-composer" aria-label="Save a photo memory"><p><PetLine species={record.pet.species} personality={record.pet.appearance.personality} event="photo_prompt" context={record.id} /></p><h2>{record.kind==='manual'?'feed brain folder':'keep eyeball souvenir'}</h2><p>Photos stay on this device. They are not reviewed as proof of an outdoor visit.</p>{record.kind==='outing'&&<p className="unverified-photo-label">Unverified adventure photos. No GPS or outdoor presence is verified.</p>}<div className="photo-input-actions"><button type="button" className="text-button" disabled={busy} onClick={()=>void takePhoto()} aria-label="Take a photo">camera eyeballs</button><button type="button" className="text-button" disabled={busy} onClick={()=>gallery.current?.click()} aria-label="Choose a photo">pick eyeball souvenir</button></div><input ref={camera} data-photo-input="camera" className="sr-only" type="file" accept="image/*" capture="environment" aria-label="Take an outdoor photo" onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}} /><input ref={gallery} data-photo-input="gallery" className="sr-only" type="file" accept="image/*" aria-label="Choose an existing photo" onChange={event=>{void choose(event.target.files?.[0]);event.target.value=''}} />{(record.draftPhotoId||pending)&&<div className="photo-preview"><MemoryPhoto key={pending?'pending':record.draftPhotoId} photoId={pending?null:record.draftPhotoId} blob={pending?.blob} alt="Your selected memory photo" /><button type="button" className="text-button" disabled={busy} onClick={()=>{setBusy(true);void editDraft(profile,record.id,caption,true).then(next=>{setRecord(next);setPending(null);setMessage('Photo removed from this draft.');setPetLine('')}).catch(e=>setMessage(storageMessage(e))).finally(()=>setBusy(false))}}>Remove photo</button></div>}{record.photoPending&&!busy&&<div className="incomplete-photo" role="alert"><p>Your selected photo has not finished saving. If you reopened the page, choose the original again. Any earlier saved photo is still kept.</p><button type="button" className="text-button abandon-photo-preparation" onClick={()=>{setBusy(true);void editDraft(profile,record.id,caption,false,true).then(next=>{setRecord(next);setPending(null);setMessage('Unfinished selection discarded. Your earlier saved photo is unchanged.')}).catch(e=>setMessage(storageMessage(e))).finally(()=>setBusy(false))}}>{record.draftPhotoId?'Keep earlier saved photo':'Continue without this photo'}</button></div>}{pending&&!busy&&<button type="button" className="text-button" onClick={()=>{setBusy(true);void storePhoto(pending).catch(e=>setMessage(storageMessage(e))).finally(()=>setBusy(false))}}>Retry saving this photo</button>}{petLine && <p data-pet-speech={speechEvent}>{petLine}</p>}<label htmlFor="memory-caption">A few words (optional)</label><textarea id="memory-caption" maxLength={500} value={caption} disabled={busy} placeholder="what eyeballs witnessed?" onChange={event=>setCaption(event.target.value)} /><button type="button" className="primary-button save-memory-button" aria-label="Save memory" disabled={busy||!!pending||record.photoPending||(record.kind==='manual'&&!record.draftPhotoId&&!caption.trim())} onClick={()=>void save()}>{busy?'Saving…':'feed brain folder'}<Icon name="memories" /></button><p className="photo-save-status" role={message.includes('failed')||message.includes('storage')?'alert':'status'} aria-live="polite">{message||'You can save an adventure without a photo. Manual memories never award love or accessories.'}</p></section>
}
