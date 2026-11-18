import test from 'node:test'
import assert from 'node:assert/strict'
import {equipmentFamily,matchRepdbExercise} from './repdb-matcher.mjs'
const img={flat:{start:'images/flat/test-start.webp'}}
const row=(id,name_en,equipment)=>({id,name_en,equipment,images:img})

test('RepDB cable machine and openGym cable denote the same equipment family',()=>{
 assert.equal(equipmentFamily('Cable Machine'),'cable')
 assert.equal(equipmentFamily('cable'),'cable')
 const found=matchRepdbExercise({n:'Cable Seated Row',eq:'cable'},[
  row('seated-cable-row','Seated Cable Row','Cable Machine')
 ])
 assert.equal(found.kind,'exact')
 assert.equal(found.entry?.id,'seated-cable-row')
})
test('Tricep(s) pressdown and pushdown normalize but grip variants are not guessed',()=>{
 const found=matchRepdbExercise({n:'Cable Triceps Pressdown',eq:'cable'},[
  row('tricep-pushdown','Cable Tricep Pushdown','Cable Machine'),
  row('v-bar-tricep-pushdown','V-Bar Tricep Pushdown','Cable Machine')
 ])
 assert.equal(found.kind,'exact')
 assert.equal(found.entry?.id,'tricep-pushdown')
})
test('specific machine labels are comparable with generic leverage machine',()=>{
 const found=matchRepdbExercise({n:'Lever Chest Press',eq:'leverage machine'},[
  row('chest-press-machine','Machine Chest Press','Chest Press Machine'),
  row('cable-chest-press','Cable Chest Press','Cable Machine'),
 ])
 assert.equal(found.kind,'exact')
 assert.equal(found.entry?.id,'chest-press-machine')
})
test('dumbbell names match exactly across harmless equipment wording',()=>{
 const found=matchRepdbExercise({n:'Dumbbell Lateral Raise',eq:'dumbbell'},[
  row('lateral-raise','Dumbbell Lateral Raise','Dumbbell')
 ])
 assert.equal(found.kind,'exact')
})
test('do not confuse different equipment even when names are identical',()=>{
 const found=matchRepdbExercise({n:'Chest Press',eq:'cable'},[
  row('barbell-chest-press','Chest Press','Barbell')
 ])
 assert.equal(found.kind,'none')
})
test('do not confuse incline, flat, standing and seated variants',()=>{
 for(const [oldName,newName] of [['Incline Chest Press','Flat Chest Press'],['Seated Cable Row','Standing Cable Row'],['Wide Lat Pulldown','Close Lat Pulldown']]){
  assert.equal(matchRepdbExercise({n:oldName,eq:'cable'},[row('other',newName,'Cable Machine')]).kind,'none')
 }
})
test('multiple identical media candidates require review rather than arbitrary mapping',()=>{
 const found=matchRepdbExercise({n:'Dumbbell Curl',eq:'dumbbell'},[
  row('curl-one','Dumbbell Curl','Dumbbell'),
  row('curl-two','Dumbbell Curl','Dumbbell'),
 ])
 assert.equal(found.kind,'review')
 assert.equal(found.candidates.length,2)
})
test('generic partial name similarity does not silently attach the wrong image',()=>{
 const found=matchRepdbExercise({n:'Seated Calf Raise',eq:'machine'},[
  row('donkey-calf','Donkey Calf Raise','Calf Raise Machine'),
 ])
 assert.notEqual(found.kind,'exact')
})
