// Optional native Android barometer: relative height of a moving weight stack.
// No location permission, GPS, network call, or magnetometer. The stack must be
// at its LOWEST resting position during initial pressure zero calibration.
import { MOBILE, isAndroid } from './mobile.js'

let heightPlugin = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) throw new Error('Höhenmessung ist nur in der installierten Android-App verfügbar.')
  if (!heightPlugin) {
    const { registerPlugin } = await import('@capacitor/core')
    heightPlugin = registerPlugin('RepHeight')
  }
  return heightPlugin
}

const errorText = error => {
  const message=String(error?.message||error||'')
  return /not implemented|not registered|does not have web implementation/i.test(message)
    ? 'Der native Höhensensor fehlt in der installierten APK. Bitte die aktuelle openForm-Beta installieren.'
    : message || 'Barometer konnte nicht angesprochen werden.'
}

export async function repHeightStatus() {
  try {
    const p=await plugin()
    const result=await p.available()
    return {
      available:result?.available===true,
      sensorName:typeof result?.sensorName==='string'?result.sensorName:'',
      reason:result?.available===true?'':(result?.reason||'Kein Barometer auf diesem Gerät gefunden.'),
      permissionRequired:false,
    }
  } catch(error) {
    return {available:false,sensorName:'',reason:errorText(error),permissionRequired:false}
  }
}

export async function startRepHeight(onSample) {
  const p=await plugin()
  const status=await p.available()
  if (!status?.available) throw new Error(status?.reason||'Kein Barometer vorhanden.')
  const listener=await p.addListener('heightSample',onSample)
  try {await p.start()} catch(error) {
    await listener.remove()
    throw new Error(errorText(error))
  }
  let stopped=false
  return async () => {
    if (stopped) return
    stopped=true
    try {await p.stop()} finally {await listener.remove()}
  }
}
