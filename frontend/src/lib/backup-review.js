// Backup previews, validation and post-import verification. No write operations here.
// Keep legacy openGym's state shape untouched; the caller still uses useStore.importBackup.
export function backupCounts(state) {
  const count = key => Array.isArray(state?.[key]) ? state[key].length : 0
  return {
    workouts: count('workouts'), routines: count('routines'),
    bodyweight: count('bodyweight'), measurements: count('measurements'),
    customEx: count('customEx')
  }
}

export const backupHasEntries = state =>
  Object.values(backupCounts(state)).some(value => value > 0)

export function backupCountLabel(state) {
  const n = backupCounts(state)
  return `${n.workouts} Trainings · ${n.routines} Pläne · ${n.bodyweight} Gewichtseinträge · ${n.measurements} Körpermessungen · ${n.customEx} eigene Übungen`
}

// The caller must not announce success if data cannot be observed in the store.
export function verifyRestoredBackup(imported, actual) {
  const expected = backupCounts(imported)
  const saved = backupCounts(actual)
  const missing = Object.keys(expected).filter(key => saved[key] < expected[key])
  return { ok: !missing.length, expected, saved, missing }
}

// Check the actual on-device state mirror, not only the in-memory UI snapshot.
// A successful in-memory restore must never be presented as durable if storage failed.
export function verifyPersistedBackup(imported, rawSaved) {
  if (!rawSaved) return { ok: false, reason: 'Kein gespeicherter Trainingsstand gefunden.' }
  try {
    const parsed = JSON.parse(rawSaved)
    const check = verifyRestoredBackup(imported, parsed)
    return { ok: check.ok, reason: check.ok ? '' : `Nicht dauerhaft gespeichert: ${check.missing.join(', ')}` }
  } catch { return { ok: false, reason: 'Gespeicherter Trainingsstand konnte nicht gelesen werden.' } }
}
