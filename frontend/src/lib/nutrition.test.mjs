import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntry, entryTotals, dayTotals, normalizedNutrition, mergeNutrition, nutritionBackup, readNutritionBackup, parseOpenFoodFacts, dateLocal } from './nutrition.js'

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
