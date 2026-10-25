import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const nutrition = readFileSync(new URL('../views/Nutrition.jsx',import.meta.url),'utf8')
const settings = readFileSync(new URL('../views/NutritionGoalsSettings.jsx',import.meta.url),'utf8')
const coach = readFileSync(new URL('../views/CoachChat.jsx',import.meta.url),'utf8')
test('nutrition extras unfold between macro cards and plus button', () => {
 const macros = nutrition.indexOf('of-macro-cards')
 const extras = nutrition.indexOf('of-nutrients-accordion')
 const plus = nutrition.indexOf('of-plus-zone')
 assert.ok(macros < extras && extras < plus)
 assert.match(nutrition,/showNutritionExtras/)
 assert.match(nutrition,/Mikronährstoffe/)
 assert.match(nutrition,/Supplements heute/)
 assert.doesNotMatch(nutrition,/nav\('\/settings\/nutrition-profile'\)/)
})
test('1900 ml is allowed by the water goal input', () => {
 assert.match(settings,/min="250" max="10000" step="1"/)
 assert.match(settings,/Number\(waterGoal\) >= 250/)
})
test('coach can provide nutrition report without calling remote provider', () => {
 assert.match(coach,/if \(nutritionQuestion\(msg\)\) \{ reviewNutrition\(msg\)/)
 assert.match(coach,/Ernährung prüfen/)
})
