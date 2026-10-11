import type { Profile } from '../types/game'
import type { Outing, PhotoRecord } from '../journey/types'
import { openJourneyDB, requestValue, STORES, transactionDone } from '../journey/database'
import { loadProfile, saveProfile } from '../lib/storage'
import { createPetId } from '../lib/petId'
import { adoptPet, normalizePet } from '../pets/save'
import type { FurId, PersonalityId } from '../pets/catalog'
import { day, evaluateDays, initialState, validateState } from './rules'
import type { ChallengeState, Clock } from './rules'
export interface Legacy {profile:Profile; separatedAt:number}
type Meta<T>={id:string;value:T}
const session=createPetId()
export const clockNow=():Clock=>({now:Date.now(),timezone:`${Intl.DateTimeFormat().resolvedOptions().timeZone}:${new Date().getTimezoneOffset()}`,mono:performance.now(),session})
const get=<T,>(tx:IDBTransaction,key:string)=>requestValue<Meta<T>|undefined>(tx.objectStore('meta').get(key))
async function transaction<T>(work:(tx:IDBTransaction)=>Promise<T>,mode:IDBTransactionMode='readwrite'):Promise<T>{const db=await openJourneyDB(),tx=db.transaction([...STORES],mode),done=transactionDone(tx);try{const result=await work(tx);await done;return result}catch(e){try{tx.abort()}catch{/* already complete */}await done.catch(()=>{});throw e}}
function notify(){window.dispatchEvent(new Event('challenge-changed'));if(typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('outside-or-else:challenge');c.postMessage('changed');c.close()}}
function checkedProfile(value:unknown):Profile {
  const p=value as Profile|null
  if(!p||typeof p.id!=='string'||!p.id||typeof p.name!=='string'||!p.name.trim()||!['cat','dog'].includes(p.species)||!Number.isFinite(p.affection)||p.affection<0||p.affection>100||!Array.isArray(p.activities)||![5,10,15,30].includes(p.duration))throw new Error('Companion history is damaged. Your companion is protected.')
  return {...p,pet:normalizePet(p)}
}
function checkedLegacy(value:unknown):Legacy {const l=value as Legacy|null;if(!l||!Number.isFinite(l.separatedAt)||l.separatedAt<0)throw new Error('Legacy date data is damaged. Your companion is protected.');return {...l,profile:checkedProfile(l.profile)}}
export async function currentCompanion():Promise<Profile|null>{return transaction(async tx=>{const record=await get<Profile>(tx,'active-companion');return record?checkedProfile(record.value):null},'readonly')}
export async function protectRecovered(profile:Profile):Promise<void>{return transaction(async tx=>{const s=await stateFor(tx,profile,clockNow());if(s.separatedAt===null&&s.enabled)tx.objectStore('meta').put({id:'challenge',value:{...s,paused:true,missedDayStreak:0,safetyReason:'Your companion save was recovered. The challenge is paused; resume whenever you are ready.'}})})}
export async function legacyPets():Promise<Legacy[]>{return transaction(async tx=>{const all=await requestValue<Meta<Legacy>[]>(tx.objectStore('meta').getAll());return all.filter(r=>r.id.startsWith('legacy:')).map(r=>checkedLegacy(r.value)).sort((a,b)=>normalizePet(a.profile).generation-normalizePet(b.profile).generation)},'readonly')}
async function stateFor(tx:IDBTransaction,profile:Profile,clock:Clock){const raw=await get<ChallengeState>(tx,'challenge');const s=raw?validateState(raw.value):initialState(profile.id,normalizePet(profile).generation,clock);if(s.currentPetId!==profile.id)throw new Error('The active companion changed in another tab. Reopen this screen.');if(s.generation!==normalizePet(profile).generation)throw new Error('Companion generation data is damaged. Your companion is protected.');return s}
export async function evaluateChallenge(profile:Profile,clock=clockNow()):Promise<ChallengeState>{return transaction(async tx=>{
  const state=await stateFor(tx,profile,clock)
  if(!state.enabled||state.paused||state.separatedAt!==null)return state
  const metadata=await requestValue<Meta<Legacy>[]>(tx.objectStore('meta').getAll());for(const item of metadata)if(item.id.startsWith('legacy:'))checkedLegacy(item.value)
  const stored=loadProfile();if(!stored||stored.id!==profile.id)throw new Error('The companion save is unavailable. Challenge evaluation is protected.')
  const guarded=evaluateDays(state,clock,null)
  if(guarded.paused||clock.timezone!==state.timezone){tx.objectStore('meta').put({id:'challenge',value:guarded});return guarded}
  const records=await requestValue<Outing[]>(tx.objectStore('outings').getAll()),seen=new Set<string>()
  let latest:string|null=null
  for(const r of records){
    if(!r||typeof r!=='object'||!r.pet||typeof r.pet.id!=='string'||typeof r.id!=='string'||!['outing','manual'].includes(r.kind)||!['active','returned','completed','cancelled'].includes(r.status))throw new Error('Adventure data is damaged. Your companion is protected.')
    if(r.pet.id!==profile.id||r.kind!=='outing'||r.status!=='completed'||r.memoryDeleted)continue
    if(seen.has(r.id))continue;seen.add(r.id)
    if(!Number.isFinite(r.startedAt)||!Number.isFinite(r.endedAt)||r.endedAt!<r.startedAt)throw new Error('Adventure date data is damaged. Your companion is protected.')
    if(!r.photoId)continue
    const memory=await requestValue<Outing|undefined>(tx.objectStore('memories').get(r.id)),photo=await requestValue<PhotoRecord|undefined>(tx.objectStore('photos').get(r.photoId))
    if(!memory||memory.id!==r.id||memory.pet?.id!==profile.id||memory.status!=='completed'||memory.photoId!==r.photoId||!photo||!(photo.blob instanceof Blob)||photo.blob.size===0||!Number.isFinite(photo.width)||!Number.isFinite(photo.height)||photo.width<=0||photo.height<=0)throw new Error('An adventure photo or record is missing. Your companion is protected; repair or explicitly delete that memory.')
    const completion=r.completedAt??Math.max(r.endedAt??NaN,photo.createdAt)
    if(!Number.isFinite(completion)||completion<r.endedAt!||completion<r.startedAt||completion>clock.now||!Number.isFinite(r.endedAt))throw new Error('An adventure timestamp is invalid. Your companion is protected.')
    const date=day(completion);if(!latest||date>latest)latest=date
  }
  const next=evaluateDays(state,clock,latest)
  if(next.separatedAt!==null){const latestProfile=loadProfile();if(!latestProfile||latestProfile.id!==profile.id||!saveProfile(latestProfile))throw new Error('Companion storage could not be saved. Your companion is protected; no farewell was applied.');const archived=await get<Legacy>(tx,`legacy:${profile.id}`);if(!archived)tx.objectStore('meta').put({id:`legacy:${profile.id}`,value:{profile:{...latestProfile,pet:normalizePet(latestProfile)},separatedAt:next.separatedAt}})}
  tx.objectStore('meta').put({id:'challenge',value:next});return next
})}
export async function configureChallenge(profile:Profile,action:'enable'|'disable'|'pause'|'resume',clock=clockNow()):Promise<ChallengeState>{const result=await transaction(async tx=>{
  const previous=await stateFor(tx,profile,clock)
  if(previous.separatedAt!==null)throw new Error('This chapter has ended. Adopt your next companion to start a new challenge.')
  const next={...previous,enabled:action==='enable'?true:action==='disable'?false:previous.enabled,paused:action==='pause',graceDate:day(clock.now),missedDayStreak:0,lastEvaluationDate:day(clock.now),lastEvaluationAt:clock.now,timezone:clock.timezone,safetyReason:null,observation:{wall:clock.now,mono:clock.mono,session:clock.session}}
  if(action==='enable'||action==='resume')tx.objectStore('meta').put({id:'active-companion',value:checkedProfile(profile)})
  tx.objectStore('meta').put({id:'challenge',value:next});return next
});notify();return result}
export async function readopt(previous:Profile,choice:{species:Profile['species'];breed:string;fur:FurId;personality:PersonalityId;name:string},clock=clockNow()):Promise<{profile:Profile;saved:boolean}>{
  const next=await transaction(async tx=>{
    const canonical=await get<Profile>(tx,'active-companion')
    if(canonical&&canonical.value.id!==previous.id){const active=checkedProfile(canonical.value),stored=loadProfile();return stored?.id===active.id?stored:active}
    const state=await stateFor(tx,previous,clock)
    if(state.separatedAt===null)throw new Error('Re-adoption is available after a farewell.')
    const pointer=await get<string>(tx,'active'),unfinished=pointer?await requestValue<Outing|undefined>(tx.objectStore('outings').get(pointer.value)):null
    if(unfinished&&['active','returned'].includes(unfinished.status))throw new Error('Finish or cancel your unfinished outing in Adventure before adopting. Its photo draft is still kept.')
    const manual=await get<string>(tx,`manual:${previous.id}`),draft=manual?await requestValue<Outing|undefined>(tx.objectStore('outings').get(manual.value)):null
    if(draft?.status==='returned')throw new Error('Finish or discard your memory draft in Memories before adopting. Its photo is still kept.')
    if(!choice.name.trim()||choice.name.trim().length>24)throw new Error('Choose a name of up to 24 characters.')
    const id=createPetId(),pet=adoptPet(choice.species,choice.breed,choice.fur,choice.personality,id,new Date(clock.now).toISOString());pet.generation=state.generation+1
    const profile:Profile={...previous,id,species:choice.species,name:choice.name.trim(),affection:10,pet,outdoor:undefined}
    tx.objectStore('meta').put({id:'active-companion',value:profile})
    tx.objectStore('meta').put({id:'challenge',value:{...initialState(id,pet.generation,clock),enabled:state.enabled,paused:state.paused}})
    return profile
  })
  const saved=saveProfile(next);window.dispatchEvent(new CustomEvent('challenge-companion',{detail:{profile:next,saved}}));notify();return {profile:next,saved}
}
