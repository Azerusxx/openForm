import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeStates,STAMPED_MAPS,stampChange,resetIdsOf} from './sync-merge.js'
import * as Server from '../../../api/sync-stamps.js'
import {putIllness,clearIllness,illnessOnDay} from './illness.js'

test('both sync implementations recognise sick periods',()=>{
 assert.ok(STAMPED_MAPS.includes('illnessPeriods'))
 assert.deepEqual(Server.STAMPED_MAPS,STAMPED_MAPS)
})
test('different sick periods merge without losing workouts',()=>{
 const a={_ts:100,illnessPeriods:putIllness({},'a',{start:'2026-10-25',end:'2026-10-26'},90),workouts:[{id:'w'}]}
 const b={_ts:200,illnessPeriods:putIllness({},'b',{start:'2026-10-27'},150),workouts:[]}
 for(const s of [mergeStates(a,b),mergeStates(b,a)]){
  assert.deepEqual(Object.keys(s.illnessPeriods).sort(),['a','b'])
  assert.deepEqual(s.workouts.map(w=>w.id),['w'])
 }
})
test('delete tombstone wins over stale copy and does not resurrect',()=>{
 const old=putIllness({},'a',{start:'2026-10-25'},50)
 const deleted={_ts:200,illnessPeriods:clearIllness(old,'a',180)}
 const stale={_ts:300,illnessPeriods:old}
 for(const s of [mergeStates(deleted,stale),mergeStates(stale,deleted)])assert.equal(illnessOnDay(s,'2026-10-25'),null)
})
test('edits get stamped and whole-state reset tracks illness ids',()=>{
 const before={_ts:500,illnessPeriods:putIllness({},'s',{start:'2026-10-25'},400)}
 const after=structuredClone(before);after.illnessPeriods=putIllness(after.illnessPeriods,'s',{start:'2026-10-24'},100)
 stampChange(before,after,100)
 assert.ok(after.illnessPeriods.s._ts>500)
 assert.deepEqual(resetIdsOf(after).illnessPeriods,['s'])
})
test('older clients do not wipe stored sick periods on server',()=>{
 const cur={_ts:100,illnessPeriods:putIllness({},'s',{start:'2026-10-24'},90)}
 const old={_ts:200,workouts:[]}
 Server.stampPut(cur,old,{overRead:true,now:200})
 assert.deepEqual(old.illnessPeriods,cur.illnessPeriods)
})
