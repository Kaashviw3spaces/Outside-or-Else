import type { Profile } from '../types/game'
import { loadProfile, saveProfile } from '../lib/storage'
import { createPetId } from '../lib/petId'
import { normalizePet } from '../pets/save'
import { openJourneyDB, requestValue, STORES, transactionDone } from './database'
import { elapsed, localDay, rewardFor } from './rewards'
import { readElapsedClock } from './clock'
import { appliedRewards } from './profileProgress'
import type { Destination, JourneyData, Outing, PhotoRecord } from './types'
type Meta={id:string;value:string}
async function run<T>(mode:IDBTransactionMode,work:(tx:IDBTransaction)=>Promise<T>):Promise<T> {
  const db=await openJourneyDB(),tx=db.transaction([...STORES],mode),done=transactionDone(tx)
  try {const result=await work(tx);await done;return result} catch(error){try{tx.abort()}catch{/* transaction already finished */}await done.catch(()=>{});throw error}
}
const get=<T,>(tx:IDBTransaction,store:typeof STORES[number],id:string)=>requestValue<T|undefined>(tx.objectStore(store).get(id))
const all=<T,>(tx:IDBTransaction,store:typeof STORES[number])=>requestValue<T[]>(tx.objectStore(store).getAll())
function publish() {
  window.dispatchEvent(new Event('journey-changed'))
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('outside-or-else:journey');channel.postMessage('changed');channel.close()}
}
export async function reconcileProgress(fallback?:Profile):Promise<{profile:Profile|null;saved:boolean;changed:boolean}> {
  const [completed,canonical]=await run('readonly',tx=>Promise.all([all<Outing>(tx,'outings'),get<{id:string;value:Profile}>(tx,'meta','active-companion')]))
  // Read the latest local pet after the database read, then update it synchronously.
  const stored=loadProfile()
  const current=canonical&&canonical.value.id!==stored?.id?canonical.value:stored??fallback??null
  if(!current)return {profile:null,saved:true,changed:false}
  const records=completed.filter(r=>r.pet.id===current.id&&r.kind==='outing'&&r.status==='completed')
  if(!records.length)return {profile:current,saved:true,changed:false}
  const earned=records.reduce((sum,r)=>sum+r.reward.awarded,0)
  const applied=appliedRewards(current)
  const pet=normalizePet(current),history=[...pet.relationshipHistory]
  for(const r of records)if(r.eligible&&r.endedAt!==null&&!history.some(e=>e.adventureId===r.id&&e.type==='adventure-completed'))history.push({id:`${r.id}:completed`,type:'adventure-completed',date:new Date(r.endedAt).toISOString(),adventureId:r.id})
  const submitted=records.filter(r=>r.eligible&&r.photoVerification==='not-reviewed').map(r=>r.endedAt??0)
  const next:Profile={...current,affection:Math.min(100,current.affection+Math.max(0,earned-applied)),pet:normalizePet({...current,pet:{...pet,relationshipHistory:history}}),outdoor:{appliedRewardTotal:Math.max(applied,earned),lastOutdoorPhotoSubmittedAt:submitted.length?Math.max(...submitted):null,lastQualifyingOutdoorPhotoDate:null}}
  if(JSON.stringify(next)===JSON.stringify(current))return {profile:current,saved:true,changed:false}
  const saved=saveProfile(next)
  window.dispatchEvent(new CustomEvent('journey-profile',{detail:{profile:next,saved}}))
  return {profile:next,saved,changed:true}
}
async function change<T>(profile:Profile,work:(tx:IDBTransaction)=>Promise<T>):Promise<T> {
  const result=await run('readwrite',work)
  // The durable ledger survives even if the legacy localStorage mirror cannot be written.
  try{await reconcileProgress(profile)}finally{publish()}
  return result
}
export function getJourneyData(petId:string):Promise<JourneyData> {return run('readonly',async tx=>{
  const [activeKey,manualKey,memories]=await Promise.all([get<Meta>(tx,'meta','active'),get<Meta>(tx,'meta',`manual:${petId}`),all<Outing>(tx,'memories')])
  const active=activeKey?await get<Outing>(tx,'outings',activeKey.value):undefined
  const manualDraft=manualKey?await get<Outing>(tx,'outings',manualKey.value):undefined
  return {active:active&&active.pet.id===petId&&['active','returned'].includes(active.status)?active:null,manualDraft:manualDraft?.status==='returned'?manualDraft:null,memories:memories.sort((a,b)=>(b.endedAt??0)-(a.endedAt??0))}
})}
// Only the journey UI checkpoints time. Saved-fact and scrapbook reads stay read-only.
export async function resumeOuting(petId:string,id:string):Promise<Outing|null> {
  const reading=await readElapsedClock()
  return run('readwrite',async tx=>{
    const active=await get<Outing>(tx,'outings',id)
    if(!active||active.pet.id!==petId||!['active','returned'].includes(active.status))return null
    if(active.status!=='active')return active
    const clock=active.clock?.epoch===reading.epoch&&active.clock.ticks>reading.ticks?active.clock:reading
    const next={...active,elapsedMs:active.clock?elapsed(active,Date.now(),clock):Math.max(0,active.elapsedMs),clock}
    tx.objectStore('outings').put(next);return next
  })
}
function fresh(profile:Profile,kind:'outing'|'manual',destination:Destination|null,now:number):Outing {
  const appearance=normalizePet(profile)
  return {id:createPetId(),kind,pet:{id:profile.id,name:profile.name,species:profile.species,breed:appearance.breed,appearance:{...appearance,relationshipHistory:[]}},startedAt:now,endedAt:kind==='manual'?now:null,plannedMinutes:kind==='manual'?null:profile.duration,elapsedMs:0,destination,status:kind==='manual'?'returned':'active',eligible:false,draftPhotoId:null,photoId:null,caption:'',photoPending:false,photoVerification:'none',memoryDeleted:false,reward:{status:'pending',requested:0,awarded:0,day:null}}
}
export async function startOuting(profile:Profile,destination:Destination|null=null,now=Date.now()):Promise<Outing> {
  if(destination&&(!/^(node|way|relation)\/[1-9]\d*$/.test(destination.osmId)||!destination.name||!Number.isFinite(destination.latitude)||!Number.isFinite(destination.longitude)||Math.abs(destination.latitude)>90||Math.abs(destination.longitude)>180))return Promise.reject(new Error('This destination is invalid. Choose a listed OSM place or Free Walk.'))
  const reading=await readElapsedClock()
  return change(profile,async tx=>{
    const challenge=await get<{id:string;value:{currentPetId:string;separatedAt:number|null}}>(tx,'meta','challenge');if(challenge&&(challenge.value.currentPetId!==profile.id||challenge.value.separatedAt!==null))throw new Error('This companion has finished their chapter. Visit Home for re-adoption.')
    const pointer=await get<Meta>(tx,'meta','active'),existing=pointer?await get<Outing>(tx,'outings',pointer.value):undefined
    if(existing&&['active','returned'].includes(existing.status)){if(existing.pet.id!==profile.id)throw new Error('Another companion has an unfinished outing. Finish or cancel it first.');return existing}
    const outing={...fresh(profile,'outing',destination,now),clock:reading};tx.objectStore('outings').add(outing);tx.objectStore('meta').put({id:'active',value:outing.id});return outing
  })
}
export function manualDraft(profile:Profile):Promise<Outing> {return change(profile,async tx=>{
  const key=`manual:${profile.id}`,pointer=await get<Meta>(tx,'meta',key),existing=pointer?await get<Outing>(tx,'outings',pointer.value):undefined
  if(existing?.status==='returned')return existing
  const record=fresh(profile,'manual',null,Date.now());tx.objectStore('outings').add(record);tx.objectStore('meta').put({id:key,value:record.id});return record
})}
async function requireRecord(tx:IDBTransaction,id:string,profile:Profile):Promise<Outing> {const record=await get<Outing>(tx,'outings',id);if(!record||record.pet.id!==profile.id)throw new Error('This adventure could not be found for your companion. Reload and try again.');return record}
export async function returnFromOuting(profile:Profile,id:string,now=Date.now()):Promise<Outing> {const reading=await readElapsedClock();return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile)
  if(record.status==='returned'||record.status==='completed')return record
  if(record.status!=='active')throw new Error('This outing is no longer active.')
  if(now<record.startedAt)throw new Error('The device clock moved backwards. Correct the clock before returning.')
  const next:Outing={...record,status:'returned',endedAt:now,clock:record.clock??reading,elapsedMs:record.clock?elapsed(record,now,reading):Math.max(0,record.elapsedMs)};tx.objectStore('outings').put(next);return next
})}
export function getPhoto(id:string):Promise<PhotoRecord|undefined> {return run('readonly',tx=>get<PhotoRecord>(tx,'photos',id))}
// A tiny durable marker makes an interrupted resize/write visible after reopening.
export function beginPhotoPreparation(profile:Profile,id:string):Promise<Outing> {return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile)
  if(record.status!=='returned')throw new Error('Return before choosing a photo.')
  const next={...record,photoPending:true};tx.objectStore('outings').put(next);return next
})}
export function attachPhoto(profile:Profile,id:string,photo:Omit<PhotoRecord,'id'|'createdAt'>):Promise<Outing> {return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile);if(record.status!=='returned')throw new Error('Photos can be added after returning, before saving the memory.')
  const photoId=`photo:${id}:${createPetId()}`;tx.objectStore('photos').put({...photo,id:photoId,createdAt:Date.now()});if(record.draftPhotoId)tx.objectStore('photos').delete(record.draftPhotoId);const next={...record,draftPhotoId:photoId,photoPending:false};tx.objectStore('outings').put(next);return next
})}
export function editDraft(profile:Profile,id:string,caption:string,removePhoto=false,abandonPreparation=false):Promise<Outing> {return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile);if(record.status!=='returned')throw new Error('This memory has already been saved or cancelled.')
  if(removePhoto&&record.draftPhotoId)tx.objectStore('photos').delete(record.draftPhotoId)
  const next={...record,caption:caption.slice(0,500),photoPending:removePhoto||abandonPreparation?false:record.photoPending,draftPhotoId:removePhoto?null:record.draftPhotoId};tx.objectStore('outings').put(next);return next
})}
export function finishMemory(profile:Profile,id:string,caption:string):Promise<Outing> {return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile)
  if(record.status==='completed')return record
  if(record.status!=='returned'||record.endedAt===null)throw new Error('Return from your adventure before saving its memory.')
  if(record.photoPending)throw new Error('The selected photo has not finished saving. Choose it again or explicitly continue without this replacement.')
  const photo=record.draftPhotoId?await get<PhotoRecord>(tx,'photos',record.draftPhotoId):undefined
  if(record.draftPhotoId&&!photo)throw new Error('The selected photo is missing. Reattach it, or explicitly remove it before saving.')
  const records=await all<Outing>(tx,'outings'),day=localDay(record.endedAt)
  const used=records.filter(r=>r.status==='completed'&&r.kind==='outing'&&r.reward.day===day).reduce((sum,r)=>sum+r.reward.awarded,0)
  const stored=loadProfile(),current=stored?.id===profile.id?stored:profile,applied=appliedRewards(current)
  const total=records.filter(r=>r.status==='completed'&&r.pet.id===profile.id).reduce((sum,r)=>sum+r.reward.awarded,0)
  const love=Math.min(100,current.affection+Math.max(0,total-applied)),reward=rewardFor(record,!!photo,used,love)
  const next:Outing={...record,pet:{...record.pet,name:current.id===record.pet.id?current.name:record.pet.name},status:'completed',completedAt:Date.now(),eligible:reward.eligible,caption:caption.trim().slice(0,500),photoId:record.draftPhotoId,draftPhotoId:null,photoVerification:photo?'not-reviewed':'none',reward:{status:record.kind==='manual'?'none':'awarded',requested:reward.requested,awarded:reward.awarded,day:record.kind==='manual'?null:day}}
  tx.objectStore('outings').put(next);tx.objectStore('memories').put(next)
  if(record.kind==='manual')tx.objectStore('meta').delete(`manual:${profile.id}`)
  else {const pointer=await get<Meta>(tx,'meta','active');if(pointer?.value===id)tx.objectStore('meta').delete('active')}
  return next
})}
export function cancelOuting(profile:Profile,id:string):Promise<void> {return change(profile,async tx=>{
  const record=await requireRecord(tx,id,profile);if(record.status==='completed')throw new Error('Saved adventures cannot be cancelled. You can delete their scrapbook memory.')
  if(record.draftPhotoId)tx.objectStore('photos').delete(record.draftPhotoId)
  tx.objectStore('outings').put({...record,status:'cancelled',endedAt:record.endedAt??Date.now(),draftPhotoId:null,photoPending:false,caption:'',destination:null})
  const key=record.kind==='manual'?`manual:${profile.id}`:'active',pointer=await get<Meta>(tx,'meta',key);if(pointer?.value===id)tx.objectStore('meta').delete(key)
})}
export function deleteMemory(profile:Profile,id:string):Promise<void> {return change(profile,async tx=>{
  const memory=await get<Outing>(tx,'memories',id);if(!memory)return
  if(memory.photoId)tx.objectStore('photos').delete(memory.photoId)
  tx.objectStore('memories').delete(id)
  const ledger=await get<Outing>(tx,'outings',id);if(ledger)tx.objectStore('outings').put({...ledger,photoId:null,memoryDeleted:true,caption:'',destination:null})
})}
