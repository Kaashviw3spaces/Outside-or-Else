import { useEffect, useState } from 'react'
import { getPhoto } from '../journey/service'
import { storageMessage } from '../journey/database'
export function MemoryPhoto({photoId,blob,alt}:{photoId?:string|null;blob?:Blob;alt:string}) {
  const [image,setImage]=useState<{url:string|null;error:string}>({url:null,error:''})
  useEffect(()=>{
    let alive=true,url:string|undefined
    async function load(){try{const value=blob??(photoId?(await getPhoto(photoId))?.blob:null);if(!value)throw new Error('The saved photo is missing. The memory details are still available.');if(!alive)return;url=URL.createObjectURL(value);setImage({url,error:''})}catch(e){if(alive)setImage({url:null,error:storageMessage(e)})}}
    if(blob||photoId)void load()
    return ()=>{alive=false;if(url)URL.revokeObjectURL(url)}
  },[photoId,blob])
  if(!photoId&&!blob)return <div className="memory-no-photo" aria-label="Memory without photo"><span aria-hidden="true">☀</span><p>A little moment, kept.</p></div>
  return image.url?<img className="memory-photo" src={image.url} alt={alt} onError={()=>setImage({url:null,error:'The saved image could not be displayed. Its memory details are still here.'})} />:<p className="photo-status" role={image.error?'alert':'status'}>{image.error||'Opening your local photo…'}</p>
}
