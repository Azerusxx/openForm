import test from 'node:test'
import assert from 'node:assert/strict'
import { checkpointBeforeUpgrade, CHECKPOINT_KEY } from './openform-recovery.js'
const storage=(initial={})=>{const values={...initial};return {values,getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=v}}}
test('first launch checkpoints original training and nutrition unchanged',()=>{
 const s=storage({gym_state_v1:'{"workouts":[1]}',openform_nutrition_v1:'{"entries":[2]}'})
 assert.equal(checkpointBeforeUpgrade(s),true)
 assert.equal(JSON.parse(s.values[CHECKPOINT_KEY]).records.gym_state_v1,s.values.gym_state_v1)
 s.values.gym_state_v1='{"workouts":[]}'
 assert.equal(checkpointBeforeUpgrade(s),false)
 assert.equal(JSON.parse(s.values[CHECKPOINT_KEY]).records.gym_state_v1,'{"workouts":[1]}')
})
test('invalid, empty or unavailable stores are not overwritten',()=>{
 const bad=storage({gym_state_v1:'broken'})
 assert.equal(checkpointBeforeUpgrade(bad),false)
 assert.equal(bad.values[CHECKPOINT_KEY],undefined)
 assert.equal(checkpointBeforeUpgrade(storage()),false)
 assert.equal(checkpointBeforeUpgrade(null),false)
})
