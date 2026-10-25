import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntry, entryTotals, dayTotals, normalizedNutrition, mergeNutrition, nutritionBackup, readNutritionBackup } from './nutrition.js'

test('pre-0.3.2 food logs remain available in Weitere Einträge with unchanged calories', () => {
  const oldEntry = createEntry({ name:'Milch',quantity:300,unit:'ml',basis:'ml',per100:{kcal:40,protein:3,carbs:4,fat:1},date:'2026-10-25' })
  delete oldEntry.mealType
  const saved = normalizedNutrition({ schemaVersion: 1, entries:[oldEntry], goals:{ kcal:2200,protein:150 }})
  assert.equal(saved.entries[0].mealType,'other')
  assert.equal(entryTotals(saved.entries[0]).kcal,120)
  assert.equal(dayTotals(saved.entries,'2026-10-25').protein,9)
  assert.equal(saved.profile.waterGoal,1900)
  assert.deepEqual(saved.water,{})
})

test('meal category survives editing, backups and import without duplicate IDs', () => {
  const lunch = createEntry({ name:'Reis',quantity:120,date:'2026-10-25',mealType:'lunch',per100:{kcal:130,protein:3,carbs:27,fat:0.3} })
  const source = normalizedNutrition({schemaVersion:1,entries:[lunch],water:{'2026-10-25':750}, profile:{activity:'high',waterGoal:2300},activities:[{id:'run1',date:'2026-10-25',kcal:250,name:'Laufen'}] })
  const restored = readNutritionBackup(nutritionBackup(source))
  assert.equal(restored.entries[0].mealType,'lunch')
  assert.equal(restored.water['2026-10-25'],750)
  assert.equal(restored.profile.waterGoal,2300)
  assert.equal(restored.activities[0].kcal,250)
  const merged = mergeNutrition(source,restored)
  assert.equal(merged.entries.length,1)
  assert.equal(merged.activities.length,1)
  assert.equal(merged.water['2026-10-25'],750)
})

test('merge imports other-day water but never replaces existing logged water', () => {
  const local = normalizedNutrition({schemaVersion:1,entries:[],water:{'2026-10-24':500}})
  const imported = normalizedNutrition({schemaVersion:1,entries:[],water:{'2026-10-24':2000,'2026-10-25':1000}})
  const mixed = mergeNutrition(local, imported)
  assert.equal(mixed.water['2026-10-24'],500)
  assert.equal(mixed.water['2026-10-25'],1000)
})

test('invalid activity records are dropped without breaking food entries', () => {
  const saved = normalizedNutrition({schemaVersion:1,entries:[],activities:[{id:'none',name:'Fake',date:'2026-10-25',kcal:-500},{id:'bad',name:'Run',date:'2026-10-25',kcal:180}]})
  assert.equal(saved.activities.length,1)
  assert.equal(saved.activities[0].kcal,180)
})
