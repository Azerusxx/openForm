// Native redundancy for nutrition. localStorage remains authoritative when valid.
// Never overwrite existing local data based on an older native snapshot.
// Keep the pure nutrition model importable by Node test runners (import.meta.env is Vite-only).
const MOBILE = import.meta.env?.VITE_MOBILE === '1'
// Keep this module dependency-free from nutrition.js to avoid a circular import during startup.
const NUTRITION_KEY = 'openform_nutrition_v1'

const FILE = 'openform-nutrition-backup.json'
let writeQueue = Promise.resolve()
function valid(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    return data && data.schemaVersion === 1 && Array.isArray(data.entries) ? data : null
  } catch { return null }
}
export function restoreDecision(localRaw, nativeRaw) {
  if(valid(localRaw)) return { restore:false, reason:'local-valid' }
  const native = valid(nativeRaw)
  if(!native) return { restore:false, reason:'no-valid-backup' }
  return { restore:true, reason:localRaw == null ? 'local-missing' : 'local-corrupt', data:native }
}
export async function restoreNutritionMirror(store = globalThis.localStorage) {
  if(!MOBILE || !store) return { restore:false, reason:'not-mobile' }
  try {
    const { Filesystem,Directory,Encoding } = await import('@capacitor/filesystem')
    const result = await Filesystem.readFile({ path:FILE, directory:Directory.Data, encoding:Encoding.UTF8 })
    const decision = restoreDecision(store.getItem(NUTRITION_KEY), result.data)
    if(decision.restore) {
      store.setItem(NUTRITION_KEY,JSON.stringify(decision.data))
      if(typeof window !== 'undefined') window.dispatchEvent(new Event('openform-nutrition-changed'))
    }
    return decision
  } catch { return { restore:false, reason:'no-accessible-backup' } }
}
export function mirrorNutrition(data) {
  if(!MOBILE) return Promise.resolve(false)
  // Serialise writes; an older snapshot must never win a race with a newer save.
  writeQueue = writeQueue.catch(()=>{}).then(async()=>{
    const { Filesystem,Directory,Encoding } = await import('@capacitor/filesystem')
    await Filesystem.writeFile({
      path:FILE,directory:Directory.Data,encoding:Encoding.UTF8,
      data:JSON.stringify(data)
    })
    return true
  })
  return writeQueue
}
