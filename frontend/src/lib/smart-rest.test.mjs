import test from 'node:test'
import assert from 'node:assert/strict'
import {suggestRestSeconds,smartRestForSet,repDropAtSameWeight,suggestedRestForBand} from './smart-rest.js'
import {readFileSync} from 'node:fs'
const base={enabled:true,seconds:90,defaultSeconds:90,exercise:'Beinpresse',reps:10}
test('compound, isolation, low repetitions',()=>{
 assert.equal(smartRestForSet(base).seconds,150)
 assert.equal(smartRestForSet({...base,exercise:'Seitheben'}).seconds,90)
 assert.equal(smartRestForSet({...base,reps:4}).seconds,180)
 assert.equal(smartRestForSet({...base,exercise:'Bizeps',reps:4}).seconds,120)
})
test('recorded effort, performance decline and upper cap',()=>{
 assert.equal(smartRestForSet({...base,rir:1}).seconds,180)
 assert.equal(smartRestForSet({...base,rpe:9}).seconds,180)
 assert.equal(smartRestForSet({...base,failure:true}).seconds,180)
 assert.equal(smartRestForSet({...base,performanceDrop:true}).seconds,180)
 assert.equal(smartRestForSet({...base,reps:4,rir:0,performanceDrop:true}).seconds,210)
 assert.equal(smartRestForSet({...base,rir:0,rpe:10}).seconds,180)
})
test('same-load comparison excludes changed loads, warmups and uncompleted sets',()=>{
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:true},{w:90,r:10,done:true}],1),true)
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:true},{w:90,r:11,done:true}],1),false)
 assert.equal(repDropAtSameWeight([{w:90,r:10,done:true},{w:90,r:8.5,done:true}],1),false)
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:true},{w:95,r:8,done:true}],1),false)
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:false},{w:90,r:8,done:true}],1),false)
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:true,warmup:true},{w:90,r:8,done:true}],1),false)
 assert.equal(repDropAtSameWeight([{w:90,r:12,done:true},{w:90,r:9,done:false}],1),false)
 assert.equal(repDropAtSameWeight([{r:12,done:true},{r:7,done:true}],1),false)
})
test('manual overrides, switch, warm-up, pyramid, cardio and disabled mode',()=>{
 for(const key of ['customRest','specializedRest','superset','warmup'])
   assert.deepEqual(smartRestForSet({...base,[key]:true,rir:0}),{seconds:90,reason:'',source:'unchanged'})
 assert.equal(smartRestForSet({...base,enabled:false}).seconds,90)
 assert.equal(smartRestForSet({...base,seconds:0}).seconds,0)
 assert.equal(smartRestForSet({...base,mode:'cardio'}).seconds,90)
 assert.equal(smartRestForSet({...base,mode:'time'}).seconds,90)
 assert.equal(suggestRestSeconds({exercise:'Beinpresse',userSeconds:110,rir:0}).seconds,110)
})
test('missing effort is unknown, not failure',()=>{
 assert.equal(suggestRestSeconds({exercise:'Beinpresse',rir:'',rpe:''}).seconds,150)
 assert.equal(suggestRestSeconds({exercise:'Beinpresse',rir:2,rpe:9}).seconds,150)
 assert.equal(suggestRestSeconds({exercise:'',previousSeconds:100}).seconds,100)
})
test('optional RIR response affects timer recommendation only',()=>{
 const ctx={exercise:'Beinpresse',reps:10,performanceDrop:true}
 assert.equal(suggestedRestForBand(ctx,'hard').seconds,210)
 assert.equal(suggestedRestForBand(ctx,'normal').seconds,180)
 assert.equal(suggestedRestForBand(ctx,'easy').seconds,180)
 assert.equal(suggestedRestForBand(ctx,'oops'),null)
})
test('integration binds only to enabled smart timers',()=>{
 const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
 assert.match(read('../store/useStore.js'),/smartRest: false/)
 assert.match(read('../views/Workout.jsx'),/repDropAtSameWeight/)
 assert.match(read('../views/Workout.jsx'),/smartContext:/)
 assert.match(read('../store/useUI.js'),/setSmartRestEffort\(band\)/)
 assert.match(read('../components/RestTimer.jsx'),/Belastung nach dem Satz/)
})
