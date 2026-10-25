// One-time, local, non-destructive snapshot of valid pre-0.3.5 data.
export const CHECKPOINT_KEY = 'openform_pre_035_checkpoint'
const keys = ['gym_state_v1', 'openform_nutrition_v1']
export function checkpointBeforeUpgrade(storage = globalThis.localStorage) {
  try {
    if (!storage || storage.getItem(CHECKPOINT_KEY)) return false
    const records = Object.fromEntries(keys.map(key => [key, storage.getItem(key)]))
    if (!Object.values(records).some(value => value != null && value.length > 2)) return false
    for (const value of Object.values(records)) if (value != null) JSON.parse(value)
    storage.setItem(CHECKPOINT_KEY, JSON.stringify({ version: '0.3.5', savedAt: new Date().toISOString(), records }))
    return true
  } catch { return false } // Never change source keys on failure (quota, missing or malformed data).
}
