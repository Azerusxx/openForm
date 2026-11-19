import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntry, entryTotals, dayTotals, normalizedNutrition, mergeNutrition, nutritionBackup, readNutritionBackup, parseOpenFoodFacts, dateLocal } from './nutrition.js'
import { nutritionDayCardModel } from './nutrition-card.js'
import { readFileSync } from 'node:fs'

test('150 g food: correct macro totals', () => {
  const meal = createEntry({ name: 'Quark', date: '2026-10-24', quantity: 150, per100: { kcal: 70, protein: 12, carbs: 4, fat: 0.5 } })
  assert.deepEqual(entryTotals(meal), { kcal: 105, protein: 18, carbs: 6, fat: 0.8 })
  assert.deepEqual(dayTotals([meal], '2026-10-23'), { kcal: 0, protein: 0, carbs: 0, fat: 0 })
})
test('pieces need explicit portion size', () => {
  const a = createEntry({ name: 'Ei', quantity: 2, unit: 'piece', pieceSize: 60, per100: { kcal: 140, protein: 13, carbs: 1, fat: 9 } })
  assert.equal(entryTotals(a).kcal, 168)
  assert.throws(() => createEntry({ name: 'Ei', quantity: 2, unit: 'piece' }))
})
test('milliliters use per 100ml, not arbitrary g-to-ml conversion', () => {
  assert.throws(() => createEntry({ name: 'Saft', quantity: 250, unit: 'ml', basis: 'g' }))
  const a = createEntry({ name: 'Saft', quantity: 250, unit: 'ml', basis: 'ml', per100: { kcal: 40, carbs: 10 } })
  assert.equal(entryTotals(a).kcal, 100)
})
test('merging a nutrition backup keeps old entries and their values', () => {
  const original = createEntry({ name: 'Original', quantity: 100, per100: { kcal: 100 } })
  const other = createEntry({ name: 'New', quantity: 100, per100: { kcal: 200 } })
  const merged = mergeNutrition({ schemaVersion: 1, goals: {}, entries: [original] }, { schemaVersion: 1, goals: {}, entries: [{ ...original, name: 'Overwritten' }, other] })
  assert.equal(merged.entries[0].name, 'Original')
  assert.equal(merged.entries.length, 2)
  assert.equal(readNutritionBackup(nutritionBackup(merged)).entries.length, 2)
})
test('OFF only accepts records with macro values', () => {
  const base = { status: 'success', product: { product_name: 'Foo', nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5, carbohydrates_100g: 10, fat_100g: 4 } } }
  assert.equal(parseOpenFoodFacts(base, '12345678').per100.kcal, 100)
  delete base.product.nutriments.fat_100g
  assert.throws(() => parseOpenFoodFacts(base, '12345678'))
})
test('invalid storage falls back to sensible goals', () => {
  assert.equal(normalizedNutrition({}).goals.kcal, 2200)
  assert.match(dateLocal(new Date(2026, 9, 24)), /^2026-10-24$/)
})

test('daily nutrition image uses the selected date, exact portions and macro values without changing the diary', () => {
  const food = createEntry({ name:'Skyr', date:'2026-11-19', mealType:'breakfast', quantity:250,
    per100:{kcal:60, protein:10, carbs:4, fat:0} })
  const otherDay = createEntry({ name:'Brot', date:'2026-11-18', quantity:100,
    per100:{kcal:250, protein:7, carbs:49, fat:3} })
  const original = normalizedNutrition({ schemaVersion:1,entries:[food,otherDay],
    water:{'2026-11-19':1250},activities:[{id:'walk',date:'2026-11-19',name:'Weg',kcal:85}],
    goals:{kcal:2200,protein:150},supplements:[] })
  const frozen = JSON.stringify(original)
  const card = nutritionDayCardModel(original,'2026-11-19')
  assert.equal(card.date,'2026-11-19')
  assert.equal(card.entryCount,1)
  assert.equal(card.totals.kcal,150)
  assert.equal(card.totals.protein,25)
  assert.equal(card.totals.carbs,10)
  assert.equal(card.goals.kcal,2200)
  assert.equal(card.groups[0].title,'Frühstück')
  assert.equal(card.groups[0].items[0].name,'Skyr')
  assert.equal(card.groups[0].items[0].amount,'250 g')
  assert.equal(card.waterMl,1250)
  assert.equal(card.activityKcal,85)
  assert.equal(card.groups.some(g=>g.items.some(item=>item.name==='Brot')),false)
  assert.equal(JSON.stringify(original),frozen)
})

test('food card and JSON backup remain separate: daily image has no full restore semantics', () => {
 const empty=nutritionDayCardModel({schemaVersion:1,entries:[]},'2026-11-19')
 assert.equal(empty.entryCount,0)
 assert.deepEqual(empty.groups,[])
 assert.deepEqual(empty.totals,{kcal:0,protein:0,carbs:0,fat:0})
 const view=readFileSync(new URL('../views/Nutrition.jsx',import.meta.url),'utf8')
 const settings=readFileSync(new URL('../views/Settings.jsx',import.meta.url),'utf8')
 assert.match(view,/Tagesbericht als Bild teilen/)
 assert.match(view,/shareExportBlob\(dayShare.blob, name\)/)
 assert.match(view,/nutritionBackup\(loadNutrition\(\)\)/)
 assert.match(settings,/Nur Ernährung exportieren \(JSON\)/)
 assert.match(settings,/shareExport\(json, name\)/)
})
