import { PetCamera } from './platform'
export async function captureAndroidPhoto(): Promise<File | null> {
  const result = await PetCamera.capture()
  if (result.cancelled) return null
  if (!result.base64) throw new Error('The camera did not return a photo. Please retake it.')
  const decoded = atob(result.base64)
  const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0))
  return new File([bytes], 'adventure-camera.jpg', { type: 'image/jpeg' })
}
