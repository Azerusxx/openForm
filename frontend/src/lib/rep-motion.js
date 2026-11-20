// Opt-in Android-only motion stream. Android's linear acceleration sensor excludes gravity.
// No permissions, server calls or stored raw motion. The caller must stop on close/background.
import { MOBILE, isAndroid } from './mobile.js'

let nativePlugin = null
async function plugin() {
  if (!MOBILE || !(await isAndroid())) throw new Error('Der Sensor-Zähler ist derzeit nur in der Android-App verfügbar.')
  if (!nativePlugin) {
    const { registerPlugin } = await import('@capacitor/core')
    nativePlugin = registerPlugin('RepMotion')
  }
  return nativePlugin
}

export async function repMotionAvailable() {
  try {
    const p = await plugin()
    return !!(await p.available()).available
  } catch {
    return false
  }
}

export async function startRepMotion(onSample) {
  const p = await plugin()
  const status = await p.available()
  if (!status?.available) throw new Error('Dieses Handy hat keinen unterstützten linearen Beschleunigungssensor.')
  const listener = await p.addListener('sample', onSample)
  try { await p.start() }
  catch (err) { await listener.remove(); throw err }
  let stopped = false
  return async () => {
    if (stopped) return
    stopped = true
    try { await p.stop() } finally { await listener.remove() }
  }
}
