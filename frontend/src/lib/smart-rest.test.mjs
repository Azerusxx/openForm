import test from 'node:test'
import assert from 'node:assert/strict'
import { suggestRestSeconds, smartRestForSet } from './smart-rest.js'
import { readFileSync } from 'node:fs'
const base={enabled:true,seconds:90,defaultSeconds:90,exercise:'Beinpresse',reps:10}
test('heuristic separates compound and isolation, low rep adjusts the pause',()=>{
 assert.equal(smartRestForSet(base).seconds,150)
 assert.equal(smartRestForSet({...base,exercise:'Seitheben'}).seconds,90)
 assert.equal(smartRestForSet({...base,reps:4}).seconds,180)
})
test('off by default and global timer off preserve current behavior',()=>{
 assert.equal(smartRestForSet({...base,enabled:false}).seconds,90)
 assert.equal(smartRestForSet({...base,seconds:0}).seconds,0)
 assert.equal(smartRestForSet({...base,defaultSeconds:0}).seconds,90)
})
test('manual, superset, special rest, warmup, cardio and timed rest remain authoritative',()=>{
 for(const key of ['customRest','specializedRest','superset','warmup'])
   assert.deepEqual(smartRestForSet({...base,[key]:true}),{seconds:90,reason:'',source:'unchanged'})
 assert.equal(smartRestForSet({...base,mode:'cardio'}).seconds,90)
 assert.equal(smartRestForSet({...base,mode:'time'}).seconds,90)
 assert.equal(suggestRestSeconds({exercise:'Beinpresse',userSeconds:120}).seconds,120)
})
test('invalid reps and unknown exercises do not create false high effort',()=>{
 assert.equal(suggestRestSeconds({exercise:'Beinpresse',reps:0}).seconds,150)
 assert.equal(suggestRestSeconds({exercise:'',previousSeconds:100}).seconds,100)
})
test('integration is opt-in with preserved workout flow and timer controls',()=>{
 const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
 assert.match(read('../store/useStore.js'),/smartRest: false/)
 assert.match(read('../views/Workout.jsx'),/enabled: S.smartRest === true/)
 assert.match(read('../views/Settings.jsx'),/Intelligenter Pausentimer/)
 assert.match(read('../components/RestTimer.jsx'),/Empfohlene Pause/)
 assert.match(read('../components/RestTimer.jsx'),/addRest\(15\)/)
})
