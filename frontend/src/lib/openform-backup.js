import { normalizedNutrition } from './nutrition.js'

// A complete portable JSON snapshot. Training format is deliberately unchanged:
// existing OpenGym imports continue to work through their original import flow.
export const COMPLETE_KIND = 'openform-complete'
export const COMPLETE_VERSION = 1

export function createCompleteBackup(training, nutrition, now = new Date()) {
  if (!training || typeof training !== 'object' || !Array.isArray(training.workouts) || !Array.isArray(training.bodyweight)) {
    throw new Error('Trainingsdaten fehlen. Komplettbackup nicht erstellt.')
  }
  return {
    kind: COMPLETE_KIND,
    schemaVersion: COMPLETE_VERSION,
    exportedAt: now.toISOString(),
    training,
    nutrition: normalizedNutrition(nutrition),
    notes: 'Training und Ernährung als JSON. Fotos/Videos separat über das Medien-ZIP sichern. Kein Cloud-Sync der Ernährung.'
  }
}

export function parseCompleteBackup(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!data || data.kind !== COMPLETE_KIND || data.schemaVersion !== COMPLETE_VERSION ||
      !data.training || typeof data.training !== 'object' ||
      !Array.isArray(data.training.workouts) || !Array.isArray(data.training.bodyweight) ||
      !Array.isArray(data.training.routines) ||
      !data.nutrition || data.nutrition.schemaVersion !== 1 || !Array.isArray(data.nutrition.entries)) {
    throw new Error('Ungültiges openForm-Komplettbackup. Training und Ernährung müssen enthalten sein.')
  }
  return { training: data.training, nutrition: normalizedNutrition(data.nutrition), exportedAt: data.exportedAt }
}

export function backupManifest(backup) {
 const b = backup?.kind === COMPLETE_KIND ? backup : createCompleteBackup(backup.training, backup.nutrition)
 const t=b.training,n=b.nutrition
 return {workouts:t.workouts?.length||0,bodyweight:t.bodyweight?.length||0,routines:t.routines?.length||0,
   bodyMeasurements:(t.bodyMeasurements||t.measurements||[]).length||0,
   entries:n.entries.length,water:n.water?.length||0,activities:n.activities?.length||0,
   favorites:n.favorites?.length||0,recipes:n.recipes?.length||0,supplements:n.supplements?.length||0,
   goals:!!n.goals,profile:!!n.profile}
}
export function verifyCompleteSnapshot(original, restored) {
 const one=backupManifest(original),two=backupManifest(restored)
 const lost=Object.keys(one).filter(k=>one[k]!==two[k])
 return {ok:lost.length===0,missing:lost,before:one,after:two}
}

/** Verify all imported nutrition records without assuming every field is an array.
 * The existing local values win on identity conflicts. Water is a dated object.
 */
export function verifyNutritionRestore(imported, restored) {
 const n=normalizedNutrition(imported), r=normalizedNutrition(restored)
 const missing=[]
 for(const key of ['entries','activities','favorites','recipes','supplements']){
   const ids=new Set((r[key]||[]).map(x=>x.id))
   const lost=(n[key]||[]).filter(x=>!ids.has(x.id))
   if(lost.length)missing.push(key+': '+lost.length)
 }
 for(const date of Object.keys(n.water||{})){
   if(!Object.hasOwn(r.water||{},date))missing.push('water: '+date)
 }
 return {ok:!missing.length,missing}
}
export function verifyBackupRoundTrip(training,nutrition){
 const exported=createCompleteBackup(training,nutrition)
 const parsed=parseCompleteBackup(JSON.stringify(exported))
 const verified=verifyCompleteSnapshot(exported,createCompleteBackup(parsed.training,parsed.nutrition))
 return {...verified,manifest:backupManifest(exported)}
}
