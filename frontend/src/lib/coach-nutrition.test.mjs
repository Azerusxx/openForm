import test from 'node:test'
import assert from 'node:assert/strict'
import { coachNutritionReport, nutritionQuestion } from './coach-nutrition.js'
import { NEW_NUTRITION, createEntry } from './nutrition.js'
test('nutrition questions are processed locally', () => {
  assert.equal(nutritionQuestion('Wie läuft meine Ernährung?'),true)
  assert.equal(nutritionQuestion('Wie lief mein Ganzkörper C?'),false)
  assert.equal(nutritionQuestion('Was hat mein Protein heute gemacht?'),true)
  assert.equal(nutritionQuestion('Wie viel Eiweiß fehlt?'),true)
})
test('missing logs are not called zero food intake', () => {
  const text = coachNutritionReport(NEW_NUTRITION(),{workouts:[]},'2026-10-25')
  assert.match(text,/keine Mahlzeiten/)
  assert.match(text,/nicht, dass du nichts gegessen hast/)
})
test('nutrition coach uses actual macros without inventing training calories', () => {
  const d = NEW_NUTRITION()
  d.entries=[createEntry({name:'Reis', date:'2026-10-25', quantity:100,per100:{kcal:150,protein:5,carbs:30,fat:1}})]
  d.supplements=[{id:'1',name:'Kreatin',dose:5,unit:'g',logs:['2026-10-25']}]
  const text=coachNutritionReport(d,{workouts:[{id:'x'}]},'2026-10-25')
  assert.match(text,/150 von 2200 kcal/)
  assert.match(text,/5 von 150 g Protein/)
  assert.match(text,/145 g/)
  assert.match(text,/1 von 1 als eingenommen/)
  assert.match(text,/nicht geschätzt/)
})
