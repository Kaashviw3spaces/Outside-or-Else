export interface ElapsedClock { ticks:number; epoch:string }
interface NativeClockBridge {
  isNativePlatform():boolean
  getPlatform():string
  Plugins:{PetClock:{read():Promise<ElapsedClock>}}
}
let latest:ElapsedClock|null=null
let sampledAt=0
export function currentElapsedClock():ElapsedClock {
  if(latest)return {...latest,ticks:latest.ticks+Math.max(0,performance.now()-sampledAt)}
  return {ticks:performance.now(),epoch:`web:${performance.timeOrigin}`}
}
export async function readElapsedClock():Promise<ElapsedClock> {
  const bridge=(globalThis as typeof globalThis & {Capacitor?:NativeClockBridge}).Capacitor
  const reading=bridge?.isNativePlatform()&&bridge.getPlatform()==='android'
    ?await bridge.Plugins.PetClock.read()
    :{ticks:performance.now(),epoch:`web:${performance.timeOrigin}`}
  if(!Number.isFinite(reading.ticks)||reading.ticks<0||typeof reading.epoch!=='string'||!reading.epoch)throw new Error('Adventure elapsed time is unavailable. Please try again.')
  latest=reading;sampledAt=performance.now();return reading
}
