import test from 'node:test'
import assert from 'node:assert/strict'
import { createCompleteBackup, parseCompleteBackup } from './openform-backup.js'
import { createEntry, mergeNutrition, NEW_NUTRITION } from './nutrition.js'

const gym = { routines: [], workouts: [{ id: 'w1', d: '2026-10-24' }], bodyweight: [{d:'2026-10-24',w:77}], targetW: 75, unit:'kg' }
const meal = createEntry({name:'Skyr',quantity:200,unit:'g',basis:'g',date:'2026-10-24',per100:{kcal:50,protein:10,carbs:4,fat:0}})

test('one backup exports complete training and nutrition and restores both', () => {
  const nutrition = { ...NEW_NUTRITION(), entries: [meal] }
  const payload = createCompleteBackup(gym, nutrition, new Date('2026-10-24T12:00:00Z'))
  const restored = parseCompleteBackup(JSON.stringify(payload))
  assert.equal(restored.training.workouts[0].id, 'w1')
  assert.equal(restored.training.bodyweight[0].w, 77)
  assert.equal(restored.nutrition.entries[0].name, 'Skyr')
  assert.equal(restored.nutrition.goals.protein, 150)
  assert.equal(restored.nutrition.profile.activity, 'moderate')
})
test('rejects truncated or gym-only backups instead of silently wiping nutrition', () => {
  assert.throws(() => parseCompleteBackup(JSON.stringify({kind:'openform-complete',schemaVersion:1, training:gym})))
  assert.throws(() => parseCompleteBackup(JSON.stringify(gym)))
  assert.throws(() => parseCompleteBackup('no json'))
})
test('import nutrition merges entries, preserving existing local meals', () => {
  const existing = { ...NEW_NUTRITION(), entries: [meal] }
  const second = createEntry({name:'Reis',quantity:100,unit:'g',basis:'g',date:'2026-10-24',per100:{kcal:100,protein:3,carbs:22,fat:1}})
  const restored = parseCompleteBackup(createCompleteBackup(gym,{...NEW_NUTRITION(),entries:[second]}))
  assert.equal(mergeNutrition(existing, restored.nutrition).entries.length, 2)
})
