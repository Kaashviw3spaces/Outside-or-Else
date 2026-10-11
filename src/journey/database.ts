export const JOURNEY_DB='outside-or-else:journey-v1'
export const STORES=['outings','memories','photos','meta'] as const
export type StoreName=typeof STORES[number]
let connection:Promise<IDBDatabase>|null=null
export function openJourneyDB():Promise<IDBDatabase> {
  if(connection)return connection
  connection=new Promise<IDBDatabase>((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('This browser cannot store adventures or photos. IndexedDB is unavailable.'));return}
    const request=indexedDB.open(JOURNEY_DB,1)
    let blocked=false
    request.onupgradeneeded=()=>{for(const name of STORES)if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'})}
    request.onsuccess=()=>{const db=request.result;if(blocked){db.close();return}db.onversionchange=()=>{db.close();connection=null};resolve(db)}
    request.onerror=()=>reject(request.error??new Error('The local scrapbook database could not open.'))
    request.onblocked=()=>{blocked=true;reject(new Error('Another tab is blocking the scrapbook database. Close other game tabs and retry.'))}
  }).catch(error=>{connection=null;throw error})
  return connection
}
export function requestValue<T>(request:IDBRequest):Promise<T> {return new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result as T);request.onerror=()=>reject(request.error)})}
export function transactionDone(tx:IDBTransaction):Promise<void> {return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??new Error('Local save was interrupted. Your previous data is unchanged.'));tx.onerror=()=>{/* onabort reports the final failure */}})}
export function storageMessage(error:unknown):string {
  if(error instanceof DOMException&&error.name==='QuotaExceededError')return 'This device is out of storage. Your photo has not been discarded. Free space or delete older memories, then retry.'
  return error instanceof Error?error.message:'The local save failed. Your previous records are unchanged. Please retry.'
}
