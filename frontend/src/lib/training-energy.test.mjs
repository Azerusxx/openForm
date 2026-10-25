import test from 'node:test'
import assert from 'node:assert/strict'
import { workoutEnergyEstimate, trainingEnergyForDay } from './training-energy.js'

const session = {
  id:'w1', name:'Ganzkörper C', d:'2026-10-25',
  start:Date.parse('2026-10-25T18:00:00'),
  end:Date.parse('2026-10-25T19:00:00'),
  entries:[{ id:'0030', target:{mode:'reps'}, sets:[{w:75,r:10,done:true}] }],
}
test('estimates logged training from duration and body weight', () => {
  assert.deepEqual(workoutEnergyEstimate(session,80),{id:'w1',name:'Ganzkörper C',kcal:294,minutes:60})
})
test('does not invent energy from missing duration, finished sets or weight', () => {
  assert.equal(workoutEnergyEstimate({...session,end:undefined},80),null)
  assert.equal(workoutEnergyEstimate({...session,entries:[]},80),null)
  assert.equal(workoutEnergyEstimate(session,undefined),null)
  assert.equal(workoutEnergyEstimate({...session,end:session.start+10*3600000},80),null)
})
test('supports pounds and only includes workouts on the requested day', () => {
  const actual = trainingEnergyForDay([session,{...session,id:'older',d:'2026-10-24'}],'2026-10-25',176.36981,'lb')
  assert.equal(actual.sessions.length,1)
  assert.equal(actual.kcal,294)
})
test('uses bodyweight saved for the session when present', () => {
  assert.equal(workoutEnergyEstimate({...session,bw:70},80).kcal,257)
})
