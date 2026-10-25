import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const load = p => readFileSync(new URL(p,import.meta.url),'utf8')
test('Health Connect permissions are administered from general settings only',()=>{
 const settings=load('../views/Settings.jsx')
 const nutrition=load('../views/Nutrition.jsx')
 assert.match(settings,/function HealthConnectCard/)
 assert.match(settings,/Schritte lesen/)
 assert.match(settings,/Spaziergänge prüfen/)
 assert.match(settings,/Berechtigungen verwalten/)
 assert.match(nutrition,/Verbindung über Einstellungen/)
 assert.doesNotMatch(nutrition,/fetchSteps\(true\)/)
 assert.doesNotMatch(nutrition,/>Verbinden<\/button>/)
})
test('Calorie budget is disclosed and only an explicit MET bonus can alter it',()=>{
 const src=load('../views/Nutrition.jsx')
 assert.match(src,/includeActivityCalories/)
 assert.match(src,/a\.source==='met_estimate'/)
 for (const label of ['Grundziel','Aktivitätsbonus','Wirksames Budget']) assert.ok(src.includes(label))
 assert.match(src,/aria-valuemax=\{\(data\.goals\.kcal\|\|0\)\+activeBonus\}/)
})
