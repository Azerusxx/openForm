import test from 'node:test'
import assert from 'node:assert/strict'
import { backupCounts, backupHasEntries, backupCountLabel, verifyRestoredBackup, verifyPersistedBackup } from './backup-review.js'

test('counts legacy openGym state without altering its schema', () => {
 const backup = { workouts:[{id:1},{id:2}], routines:[{id:'a'}], bodyweight:[{d:'2026-10-25'}] }
 assert.deepEqual(backupCounts(backup), {workouts:2,routines:1,bodyweight:1,measurements:0,customEx:0})
 assert.match(backupCountLabel(backup),/2 Trainings/)
 assert.equal(backupHasEntries(backup), true)
})
test('empty legacy backup cannot be mistaken for successful data recovery', () => {
 assert.equal(backupHasEntries({ workouts:[], routines:[] }), false)
})
test('verifies that imported data is actually present after restoring', () => {
 const b={workouts:[{},{}],routines:[{}],bodyweight:[],measurements:[],customEx:[]}
 assert.deepEqual(verifyRestoredBackup(b,{workouts:[],routines:[]}).missing,['workouts','routines'])
 assert.equal(verifyRestoredBackup(b,{workouts:[{},{},{}],routines:[{}]}).ok,true)
})

test('checks persisted local storage, not just React in-memory state', () => {
 const b={workouts:[{id:'one'}],routines:[]}
 assert.equal(verifyPersistedBackup(b,JSON.stringify(b)).ok,true)
 assert.equal(verifyPersistedBackup(b,JSON.stringify({workouts:[],routines:[]})).ok,false)
 assert.equal(verifyPersistedBackup(b,'broken').ok,false)
})
