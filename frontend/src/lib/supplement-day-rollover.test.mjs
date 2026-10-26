import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizedNutrition} from './nutrition.js'
const view=readFileSync(new URL('../views/Nutrition.jsx',import.meta.url),'utf8')
const yesterday='2026-10-25',today='2026-10-26'
test('daily supplement taken status is based on selected date, never previous day',()=>{
 const s={id:'mag',name:'Magnesium',dose:1,unit:'piece',nutrients:{magnesium:400},logs:[yesterday]}
 const n=normalizedNutrition({schemaVersion:1,entries:[],supplements:[s]})
 assert.equal(n.supplements[0].logs.includes(yesterday),true)
 assert.equal(n.supplements[0].logs.includes(today),false)
 assert.equal(n.supplements[0].logs.includes(yesterday),true)
})
test('the selected current day rolls forward after midnight or Android app resume',()=>{
 assert.ok(view.includes("setDate(chosen => chosen === previous ? now : chosen)"))
 assert.ok(view.includes("document.addEventListener('visibilitychange', onVisibility)"))
 assert.ok(view.includes("window.addEventListener('focus', onResume)"))
 assert.ok(view.includes('window.setInterval(onResume, 60_000)'))
 assert.ok(view.includes('date !== dateLocal()'))
})
test('previously checked days are retained for history and do not become today',()=>{
 assert.ok(view.includes('checked={s.logs.includes(date)}'))
 assert.ok(view.includes('s.logs.includes(date) ? s.logs.filter(x => x !== date) : [...s.logs, date]'))
})
