import type { PhotoRecord } from './types'
export async function preparePhoto(file:File):Promise<Omit<PhotoRecord,'id'|'createdAt'>> {
  if(!file.size)throw new Error('This photo is empty. Please choose another image.')
  if(file.size>30*1024*1024)throw new Error('Please choose a photo smaller than 30 MB.')
  if(file.type==='image/svg+xml'||(!file.type.startsWith('image/')&&!/\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(file.name)))throw new Error('Choose a supported photo such as JPEG, PNG or WebP.')
  const url=URL.createObjectURL(file)
  try {
    const image=new Image()
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This image could not be decoded. HEIC support varies; try exporting it as JPEG.'));image.src=url})
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80000000)throw new Error('This image is too large or damaged. Please choose another photo.')
    const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),width=Math.max(1,Math.round(image.naturalWidth*scale)),height=Math.max(1,Math.round(image.naturalHeight*scale))
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
    const context=canvas.getContext('2d');if(!context)throw new Error('This browser could not prepare the photo.')
    context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height)
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Photo compression failed. Please retry.')),'image/jpeg',.82))
    return {blob,width,height}
  } finally {URL.revokeObjectURL(url)}
}
