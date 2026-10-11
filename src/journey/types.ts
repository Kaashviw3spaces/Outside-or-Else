import type { Duration, Species } from '../types/game'
import type { PetDetails } from '../pets/save'
export interface Destination { osmId:string; name:string; category:string; latitude:number; longitude:number }
export interface PetSnapshot { id:string; name:string; species:Species; breed:string; appearance:PetDetails }
export interface Outing {
  clock?:{ticks:number;epoch:string}
  id:string; kind:'outing'|'manual'; pet:PetSnapshot; startedAt:number; endedAt:number|null; plannedMinutes:Duration|null; elapsedMs:number
  destination:Destination|null; status:'active'|'returned'|'completed'|'cancelled'; eligible:boolean; draftPhotoId:string|null; photoId:string|null
  completedAt?:number; caption:string; photoPending:boolean; photoVerification:'none'|'not-reviewed'; memoryDeleted:boolean
  reward:{status:'pending'|'awarded'|'none';requested:number;awarded:number;day:string|null}
}
export interface PhotoRecord { id:string; blob:Blob; width:number; height:number; createdAt:number }
export interface JourneyData { active:Outing|null; memories:Outing[]; manualDraft:Outing|null }
export interface OutdoorProgress { appliedRewardTotal:number; lastOutdoorPhotoSubmittedAt:number|null; lastQualifyingOutdoorPhotoDate:null }
