import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntry, dayTotals, normalizedNutrition, mergeNutrition, nutritionBackup, readNutritionBackup } from './nutrition.js'
import { addFavorite, repeatMeal, createRecipe, recipeTotals, logRecipe, weeklyNutrition } from './nutrition-extra.js'

const meal = (name, quantity, per100, date = '2026-10-24', unit = 'g') => createEntry({name, quantity, per100, date, unit, basis:unit})

test('favorite snapshots survive editing/deleting old entry and repeat gets a fresh ID', () => {
  const a = meal('Hähnchen', 150, { kcal: 110, protein: 24, carbs: 0, fat: 1 })
  const state = addFavorite(normalizedNutrition({schemaVersion:1, entries:[a]}), a)
  assert.equal(state.favorites.length,1)
  const repeated = repeatMeal(state.favorites[0].food,'2026-10-25')
  assert.notEqual(repeated.id, a.id)
  assert.equal(dayTotals([repeated],'2026-10-25').protein,36)
  assert.equal(addFavorite(state, a).favorites.length,0)
})
test('recipe retains grams and milliliters without treating ml as g', () => {
  const a = meal('Reis', 200,{kcal:120,protein:3,carbs:25,fat:0})
  const b = meal('Milch', 500,{kcal:50,protein:3.5,carbs:5,fat:2},'2026-10-24','ml')
  const r = createRecipe('Reis mit Milch',[a,b],2)
  assert.deepEqual(recipeTotals(r),{kcal:245,protein:11.8,carbs:37.5,fat:5})
  const portions = logRecipe(r,1,'2026-10-25')
  assert.deepEqual(portions.map(p=>p.unit),['g','ml'])
  assert.equal(dayTotals(portions,'2026-10-25').kcal,245)
})
test('backup merge retains favorites, recipes and supplements with existing entries', () => {
  const a = meal('Ei',100,{kcal:155,protein:13,carbs:1,fat:11})
  const x = normalizedNutrition({schemaVersion:1,entries:[a]})
  const saved = addFavorite(x,a)
  saved.recipes = [createRecipe('Ei pur',[a],1)]
  saved.supplements = [{ id:'creatine',name:'Kreatin',dose:5,unit:'g',logs:['2026-10-24'] }]
  const restored = readNutritionBackup(nutritionBackup(saved))
  assert.equal(restored.favorites[0].food.name,'Ei')
  assert.equal(restored.recipes.length,1)
  assert.equal(restored.supplements[0].logs[0],'2026-10-24')
  const combined = mergeNutrition(x,restored)
  assert.equal(combined.entries.length,1)
  assert.equal(combined.recipes.length,1)
})
test('week averages only logged days and respects local days', () => {
  const a = meal('Skyr',200,{kcal:60,protein:10,carbs:4,fat:0},'2026-10-24')
  const w = weeklyNutrition([a],'2026-10-24',{kcal:2200,protein:150})
  assert.equal(w.daysLogged,1)
  assert.equal(w.average.kcal,120)
  assert.equal(w.average.protein,20)
  assert.equal(w.days[6].date,'2026-10-24')
})
test('legacy ID favorites migrate to reusable snapshots',()=>{
 const a=meal('Alteintrag',100,{kcal:99,protein:8,carbs:8,fat:2})
 const d=normalizedNutrition({schemaVersion:1,entries:[a],favorites:[a.id]})
 assert.equal(d.favorites[0].food.name,'Alteintrag')
})
