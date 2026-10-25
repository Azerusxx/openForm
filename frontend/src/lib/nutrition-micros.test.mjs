import test from 'node:test'
import assert from 'node:assert/strict'
import { createEntry, normalizedNutrition, entryMicros, dayMicros, nutritionBackup, readNutritionBackup, parseOpenFoodFacts } from './nutrition.js'
test('optional micronutrients are not interpreted as 0', () => {
 const e=createEntry({name:'Brokkoli',date:'2026-10-25',quantity:150,per100:{kcal:30,protein:3,carbs:5,fat:0.5},per100Micros:{fiber:2,calcium:40,iron:''}})
 assert.deepEqual(entryMicros(e),{fiber:3,calcium:60})
 assert.deepEqual(dayMicros([e],'2026-10-25'),{fiber:3,calcium:60})
 const read=readNutritionBackup(nutritionBackup(normalizedNutrition({schemaVersion:1,entries:[e]})))
 assert.deepEqual(read.entries[0].per100Micros,{fiber:2,calcium:40})
})
test('Open Food Facts micronutrients convert grams to milligrams', () => {
 const product=parseOpenFoodFacts({status:'success',product:{product_name:'Test',nutriments:{'energy-kcal_100g':80,proteins_100g:2,carbohydrates_100g:10,fat_100g:3,'calcium_100g':0.12, 'fiber_100g':4}}},'12345678')
 assert.equal(product.per100Micros.calcium,120)
 assert.equal(product.per100Micros.fiber,4)
 assert.equal(product.per100Micros.vitaminD,undefined)
})

test('favourite and recipe copies retain optional micro values', async () => {
 const { foodTemplate, repeatMeal, createRecipe, logRecipe } = await import('./nutrition-extra.js')
 const e=createEntry({name:'Spinat',date:'2026-10-25',quantity:100,per100:{kcal:50,protein:4,carbs:4,fat:0},per100Micros:{magnesium:70}})
 assert.equal(foodTemplate(e).per100Micros.magnesium,70)
 assert.equal(repeatMeal(foodTemplate(e),'2026-10-25').per100Micros.magnesium,70)
 const recipe=createRecipe('Spinatrezept',[e],2)
 assert.equal(logRecipe(recipe,1,'2026-10-25')[0].per100Micros.magnesium,70)
})
