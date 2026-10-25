import test from 'node:test'
import assert from 'node:assert/strict'
import { needsProgressionReview, canHoldPrevious, holdPreviousProgression, acceptProgression } from './progression-review.js'
import { readFileSync } from 'node:fs'
const entry={id:'bench', target:{weight:75,reps:10,sets:3},planned:{sets:3,reps:10},plan:{kind:'up',policy:'linear',why:['good']},sets:[{w:75,r:10,done:false},{w:75,r:10,done:false},{w:75,r:10,done:false}]}
const last={sets:[{w:70,r:10,done:true},{w:70,r:10,done:true},{w:70,r:9,done:true}],target:{reps:10}}
test('a recommended change is reviewable; approval does not alter training sets',()=>{
 assert.equal(needsProgressionReview(entry),true)
 assert.deepEqual(acceptProgression(entry).sets,entry.sets)
 assert.equal(acceptProgression(entry).plan.reviewDecision,'accepted')
 assert.equal(entry.plan.reviewDecision,undefined)
})
test('keep previous weights/reps for same-shaped ordinary uncompleted sets only',()=>{
 const held=holdPreviousProgression(entry,last)
 assert.deepEqual(held.sets.map(s=>[s.w,s.r]),[[70,10],[70,10],[70,9]])
 assert.equal(held.target.weight,70)
 assert.equal(held.plan.reviewDecision,'held')
 assert.deepEqual(entry.sets.map(s=>s.w),[75,75,75])
 assert.deepEqual(last.sets.map(s=>s.w),[70,70,70])
})
test('never auto-revert after a set was finished or for warmups, unilateral, drop or rest-pause',()=>{
 for(const sets of [
   [{...entry.sets[0],done:true},...entry.sets.slice(1)],
   [{...entry.sets[0],warmup:true},...entry.sets.slice(1)],
   [{...entry.sets[0],sides:{L:{},R:{}}},...entry.sets.slice(1)],
   [{...entry.sets[0],type:'dropset'},...entry.sets.slice(1)],
   [{...entry.sets[0],type:'restpause'},...entry.sets.slice(1)],
   entry.sets.slice(0,2),
 ]) assert.equal(canHoldPrevious({...entry,sets},last),false)
 assert.equal(canHoldPrevious({...entry,plan:{kind:'off'}},last),false)
 assert.equal(canHoldPrevious(entry,{sets:[{w:70,r:10,done:false},...last.sets.slice(1)]}),false)
})
test('does not change completed sessions or previously approved decisions',()=>{
 assert.equal(acceptProgression({...entry,plan:{kind:'hold'}}),null)
 assert.equal(holdPreviousProgression({...entry,plan:{...entry.plan,reviewDecision:'accepted'}},last),null)
})
test('integrated workout review uses existing progression engine and explicit actions',()=>{
 const view=readFileSync(new URL('../views/Workout.jsx',import.meta.url),'utf8')
 for(const word of ['progression-review','Vorschlag übernehmen','Letzte Werte','canHoldPrevious','acceptProgression','holdPreviousProgression']) assert.ok(view.includes(word),word)
})
