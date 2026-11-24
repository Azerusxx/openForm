// Local Android motion source. A built-in linear acceleration sensor is preferred;
// a normal accelerometer with a native gravity-removal filter is the fallback.
// No Android motion permission is needed at our 25 Hz sampling rate.
import { MOBILE, isAndroid } from './mobile.js'

let nativePlugin = null

async function plugin() {
  if (!MOBILE || !(await isAndroid())) {
    throw new Error('Sensorzählung funktioniert nur in der installierten Android-App, nicht im Browser.')
  }
  if (!nativePlugin) {
    const { registerPlugin } = await import('@capacitor/core')
    nativePlugin = registerPlugin('RepMotion')
  }
  return nativePlugin
}

function problem(error) {
  const message = String(error?.message || error || '')
  if (/not implemented|not available|not registered|does not have web implementation/i.test(message)) {
    return 'Die installierte openForm-Version enthält keinen funktionierenden RepMotion-Dienst. Bitte die neueste Beta als APK-Update installieren.'
  }
  return message || 'Android-Sensorabfrage fehlgeschlagen.'
}

export async function repMotionStatus() {
  try {
    const p = await plugin()
    const result = await p.available()
    return {
      available: result?.available === true,
      mode: result?.mode === 'accelerometer' ? 'accelerometer' : result?.mode === 'linear' ? 'linear' : 'none',
      sensorName: typeof result?.sensorName === 'string' ? result.sensorName : '',
      sampleHz: result?.sampleHz || 25,
      permissionRequired: result?.permissionRequired === true,
      reason: result?.available === true ? '' : (result?.reason || 'Auf diesem Gerät wurde kein kompatibler Bewegungssensor erkannt.'),
    }
  } catch (error) {
    return { available:false, mode:'none', sensorName:'', reason:problem(error), permissionRequired:false }
  }
}

// Kept for clients of the old boolean API. New screens should display diagnostics.
export async function repMotionAvailable() {
  return (await repMotionStatus()).available
}

export async function startRepMotion(onSample) {
  const p = await plugin()
  const status = await p.available()
  if (!status?.available) throw new Error(status?.reason || 'Kein kompatibler Bewegungssensor verfügbar.')
  const listener = await p.addListener('sample', onSample)
  try { await p.start() }
  catch (error) {
    await listener.remove()
    throw new Error(problem(error))
  }
  let stopped = false
  return async () => {
    if (stopped) return
    stopped = true
    try { await p.stop() } finally { await listener.remove() }
  }
}
