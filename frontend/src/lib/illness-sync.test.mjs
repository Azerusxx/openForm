import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeStates,STAMPED_MAPS,stampChange,resetIdsOf,localExtras} from './sync-merge.js'
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



test('guest-only sickness is counted as unsynced setup, protecting it at sign-in',()=>{
 const local={illnessPeriods:putIllness({},'a',{start:'2026-10-25'},100)}
 const setup=localExtras(local,{illnessPeriods:{}})
 assert.ok(setup.setup>=1)
 assert.equal(localExtras({illnessPeriods:clearIllness(local.illnessPeriods,'a',200)},{illnessPeriods:{}}).setup||0,0)
})

test('server nudge suppresses a sickness interval without masking a later training date',async()=>{
 const {excusedOn}=await import('../../../api/nudge.js')
 const s={illnessPeriods:putIllness({},'test',{start:'2026-10-22',end:'2026-10-25'},100)}
 assert.equal(excusedOn(s,'2026-10-23'),true)
 assert.equal(excusedOn(s,'2026-10-26'),false)
})


test('QR device map stays aligned across client and server, and guest device is not dropped',()=>{
 assert.ok(STAMPED_MAPS.includes('gymDevices'))
 assert.deepEqual(Server.STAMPED_MAPS,STAMPED_MAPS)
 const device={studio:'Studio A',exId:'leg-press',label:'Beinpresse',_ts:100}
 const local={_ts:150,gymDevices:{'studio a|hashed-device':device},workouts:[]}
 const remote={_ts:200,gymDevices:{},workouts:[]}
 const setup=localExtras(local,remote)
 assert.ok(setup.setup>=1)
 const merged=mergeStates(local,remote)
 assert.equal(merged.gymDevices['studio a|hashed-device']?.exId,'leg-press')
})
test('older app uploads do not silently erase saved QR device associations',()=>{
 const original={_ts:100,gymDevices:{'studio a|hashed-device':{studio:'Studio A',exId:'leg-press',_ts:90}}}
 const fromOlderApp={_ts:200,workouts:[]}
 Server.stampPut(original,fromOlderApp,{overRead:true,now:201})
 assert.deepEqual(fromOlderApp.gymDevices,original.gymDevices)
})
