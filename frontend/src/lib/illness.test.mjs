import test from 'node:test'
import assert from 'node:assert/strict'
import {validDay,nextDay,cleanIllness,illnessOnDay,illnessRecords,latestIllness,recoveryStatus,putIllness,clearIllness,dismissRecovery} from './illness.js'
test('real dates and range validation',()=>{
 assert.equal(validDay('2026-02-30'),false)
 assert.equal(validDay('2026-02-28'),true)
 assert.equal(nextDay('2026-12-31'),'2027-01-01')
 assert.equal(cleanIllness({start:'2026-10-26',end:'2026-10-25'}),null)
 assert.equal(cleanIllness({start:'2026-10-25',end:'2026-10-26',plannedReturn:'2026-10-26'}),null)
 assert.ok(cleanIllness({start:'2026-10-25',end:null}))
})
test('range covers every calendar day, but open intervals never fill future days',()=>{
 const s={illnessPeriods:putIllness({},'sick-1',{start:'2026-10-24',end:'2026-10-27'},100)}
 assert.equal(illnessOnDay(s,'2026-10-25')?.id,'sick-1')
 assert.equal(illnessOnDay(s,'2026-10-28'),null)
 const open={illnessPeriods:putIllness({},'open',{start:'2026-10-25'},100)}
 assert.equal(illnessOnDay(open,'2026-10-26','2026-10-25'),null)
 assert.equal(latestIllness(open,'2026-10-25')?.id,'open')
})
test('delete leaves a stamped tombstone; no workouts or day notes are mutated',()=>{
 const original={workouts:[{id:'w'}],dayNotes:{'2026-10-24':{tag:'sick',_ts:1}},illnessPeriods:{}}
 const withOne=putIllness(original.illnessPeriods,'ill-1',{start:'2026-10-25',note:'  Erkältung  '},50)
 const gone=clearIllness(withOne,'ill-1',60)
 assert.equal(gone['ill-1']._ts,60)
 assert.equal(illnessRecords({illnessPeriods:gone}).length,0)
 assert.deepEqual(original.workouts,[{id:'w'}])
 assert.equal(original.dayNotes['2026-10-24'].tag,'sick')
})
test('no automatic calendar training clearance without self reported recovery and planned date',()=>{
 const record={start:'2026-10-20',end:'2026-10-25',plannedReturn:'2026-10-27'}
 assert.equal(recoveryStatus(record,'2026-10-26').state,'recovering')
 assert.equal(recoveryStatus({...record,feverFree:true,improving:true,noWarning:true,dailyEnergy:true},'2026-10-26').state,'planned')
 assert.equal(recoveryStatus({...record,feverFree:true,improving:true,noWarning:true,dailyEnergy:true,plannedReturn:null},'2026-10-26').state,'reassess')
 assert.equal(recoveryStatus({...record,feverFree:true,improving:true,noWarning:true,dailyEnergy:true},'2026-10-24').state,'ill')
})
test('clinical notes are bounded, absence of end date remains open',()=>{
 const r=cleanIllness({start:'2026-10-24',note:'a'.repeat(400),feverFree:true})
 assert.equal(r.note.length,300)
 assert.equal(r.end,null)
 assert.equal(r.improving,false)
})
test('legacy day-notes and absence of illness records remain readable',()=>{
 assert.equal(illnessOnDay({dayNotes:{'2026-10-25':{tag:'sick'}}},'2026-10-25'),null)
 assert.deepEqual(illnessRecords({}),[])
})

test('recovery acknowledgement hides only the finished period and keeps all illness dates',()=>{
 const base={start:'2026-10-25',end:'2026-10-28',plannedReturn:'2026-10-29',note:'Erholt'}
 const periods=putIllness({},'first',base,100)
 const dismissed=dismissRecovery(periods,'first','2026-11-06',200)
 assert.equal(dismissed.first.recoveryDismissedAt,'2026-11-06')
 assert.equal(dismissed.first.start,base.start)
 assert.equal(dismissed.first.end,base.end)
 assert.equal(dismissed.first.plannedReturn,base.plannedReturn)
 assert.equal(dismissed.first.note,base.note)
 assert.equal(illnessOnDay({illnessPeriods:dismissed},'2026-10-27','2026-11-06')?.id,'first')
 assert.equal(latestIllness({illnessPeriods:dismissed},'2026-11-06')?.recoveryDismissedAt,'2026-11-06')
 const next=putIllness(dismissed,'second',{start:'2026-11-05',end:'2026-11-06'},250)
 assert.equal(next.second.recoveryDismissedAt,null)
 assert.equal(next.first.recoveryDismissedAt,'2026-11-06')
})
test('an ongoing period cannot be dismissed and no medical checkboxes are changed',()=>{
 const open=putIllness({},'a',{start:'2026-11-05'},100)
 assert.throws(()=>dismissRecovery(open,'a','2026-11-06'))
 const past=putIllness({},'a',{start:'2026-11-01',end:'2026-11-05'},100)
 const done=dismissRecovery(past,'a','2026-11-06')
 assert.equal(done.a.feverFree,false)
 assert.equal(done.a.improving,false)
 assert.equal(recoveryStatus(done.a,'2026-11-06').state,'recovering')
})
