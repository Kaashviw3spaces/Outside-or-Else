import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core'
import type { ChatMessage } from '../ai/models'
export const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
// Same public Overpass endpoint; native HTTP avoids WebView CORS restrictions.
export const nativePostJSON = (url:string, data:string) => CapacitorHttp.post({ url, data, headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'OutsideOrElse/1.0 (Android)'}, responseType:'json', connectTimeout:5000, readTimeout:20000 })
export const PetLocation = registerPlugin<{
  current():Promise<{latitude:number;longitude:number}>
  openSettings():Promise<void>
}>('PetLocation')
export const PetCamera = registerPlugin<{ capture():Promise<{base64:string;cancelled?:boolean}> }>('PetCamera')
export interface NativeGeneration { text:string; tokens:number; inputTokens:number; generationMs:number; firstTokenMs:number|null }
export const PetInference = registerPlugin<{
  initialize():Promise<{loadMs:number}>
  generate(options:{messages:ChatMessage[];maxTokens:number}):Promise<NativeGeneration>
  cancel():Promise<void>
  unload():Promise<void>
}>('PetInference')
export const PetReminders = registerPlugin<{
  status():Promise<{permission:'granted'|'denied'|'prompt';scheduled:number}>
  requestPermission():Promise<{permission:'granted'|'denied'|'prompt';scheduled:number}>
  sync(options:{snapshot:string}):Promise<{permission:'granted'|'denied'|'prompt';scheduled:number}>
  test():Promise<void>
}>('PetReminders')
