import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseOpenFoodFacts, createEntry, dayMicros } from './nutrition.js'
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8')
test('OFF micro extraction restores salt-to-sodium and omega-3 without inventing absent values',()=>{
 const base={status:'success',product:{product_name:'Testprodukt',nutriments:{
  'energy-kcal_100g':180,'proteins_100g':7,'carbohydrates_100g':19,'fat_100g':8,
  'salt_100g':1.25,'omega-3-fat_100g':0.3,'fiber_100g':2.1
 }}}
 const parsed=parseOpenFoodFacts(base,'12345678')
 assert.equal(parsed.per100Micros.sodium,500)
 assert.equal(parsed.per100Micros.omega3,300)
 assert.equal(parsed.per100Micros.fiber,2.1)
 assert.equal(parsed.per100Micros.iron,undefined)
 const entry=createEntry({...parsed,name:parsed.name,quantity:200,date:'2026-11-11'})
 const totals=dayMicros([entry],'2026-11-11')
 assert.equal(totals.sodium,1000)
 assert.equal(totals.omega3,600)
 assert.equal(totals.iron,undefined)
})
test('measured sodium is preferred over salt estimate',()=>{
 const base={status:'success',product:{nutriments:{'energy-kcal_100g':100,proteins_100g:1,carbohydrates_100g:1,fat_100g:1,salt_100g:1,sodium_100g:0.1}}}
 assert.equal(parseOpenFoodFacts(base,'12345678').per100Micros.sodium,100)
})
test('workout actions use safe session swap, QR registration is persisted in sync',()=>{
 const sheets=read('../sheets.jsx'),workout=read('../views/Workout.jsx')
 assert.match(sheets,/occupiedExerciseSheet/)
 assert.match(sheets,/gymDeviceSheet/)
 assert.match(sheets,/swapActiveWorkoutExercise\(index,ex\.id\)/)
 assert.match(sheets,/swapActiveExercise\(state\.active, index, replacement, options\)/)
 assert.match(workout,/Gerät belegt – Alternative finden/)
 assert.match(workout,/Gerät scannen/)
 assert.match(read('./sync-merge.js'),/'gymDevices'/)
 assert.match(read('../store/useStore.js'),/gymDevices: \{\}/)
})
