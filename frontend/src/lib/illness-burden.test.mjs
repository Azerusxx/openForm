import test from 'node:test'
import assert from 'node:assert/strict'
import { illnessBurdenStats } from './illness-burden.js'
import { putIllness,clearIllness } from './illness.js'
import { readFileSync } from 'node:fs'
const sick=(start,end,extra={})=>({illnessPeriods:putIllness({},'s',{start,end,...extra},10)})
test('ongoing sickness reduces overall readiness without inventing muscle fatigue',()=>{
 const s=sick('2026-10-22','2026-10-27',{fatigueLevel:'strong'})
 const result=illnessBurdenStats(s,'2026-10-25')
 assert.equal(result.state,'ill')
 assert.equal(result.sickDays,4)
 assert.equal(result.level,'strong')
 assert.match(result.message,/Stark/)
 assert.match(result.recommendation,/pausieren/)
})
test('self-reported mild, medium, strong or unknown do not manufacture a numeric fatigue score',()=>{
 for(const level of ['mild','moderate','strong',null]){
  const x=illnessBurdenStats(sick('2026-10-25',null,{fatigueLevel:level}),'2026-10-25')
  assert.equal(x.state,'ill')
  assert.equal(x.level,level)
  assert.equal('fatigueScore' in x,false)
 }
})
test('same day with workout still counts as only one sick day',()=>{
 const s={...sick('2026-10-24','2026-10-25'),workouts:[{d:'2026-10-25'}]}
 assert.equal(illnessBurdenStats(s,'2026-10-25').sickDays,2)
})
test('legacy single sick notes are counted without doubling overlapping new periods',()=>{
 const s={...sick('2026-10-24','2026-10-25'),dayNotes:{
   '2026-10-23':{tag:'sick',_ts:1},'2026-10-24':{tag:'sick',_ts:2}
 }}
 assert.equal(illnessBurdenStats(s,'2026-10-25').sickDays,3)
 assert.equal(illnessBurdenStats({dayNotes:{'2026-10-25':{tag:'sick',_ts:4}}},'2026-10-25').state,'ill')
})
test('after illness ending, distinguish unconfirmed and confirmed recovery',()=>{
 const r={start:'2026-10-20',end:'2026-10-24',plannedReturn:'2026-10-28'}
 assert.equal(illnessBurdenStats({illnessPeriods:putIllness({},'s',r,5)},'2026-10-25').state,'recovering')
 const done={...r,feverFree:true,improving:true,noWarning:true,dailyEnergy:true}
 const x=illnessBurdenStats({illnessPeriods:putIllness({},'s',done,5)},'2026-10-25')
 assert.equal(x.state,'return')
 assert.match(x.message,/nicht automatisch volle Trainingsbereitschaft/)
})
test('a later unrelated sickness is not attached to an older period',()=>{
 const s=sick('2026-09-01','2026-09-03')
 assert.equal(illnessBurdenStats(s,'2026-10-25').state,'none')
 assert.equal(illnessBurdenStats(s,'2026-10-25').sickDays,0)
 const deleted={illnessPeriods:clearIllness(s.illnessPeriods,'s',30)}
 assert.equal(illnessBurdenStats(deleted,'2026-09-02').sickDays,0)
})
test('no changes to muscle fatigue calculation, saved sessions or backups',()=>{
 const stats=readFileSync(new URL('../views/Stats.jsx',import.meta.url),'utf8')
 const recovery=readFileSync(new URL('./recovery.js',import.meta.url),'utf8')
 assert.match(stats,/fatigueOf\(workouts, now/)
 assert.match(stats,/illnessBurdenStats\(S, todayISO\(\)\)/)
 assert.match(stats,/Krankheitsbedingte Belastung/)
 assert.doesNotMatch(recovery,/illnessPeriods|illnessBurdenStats/)
 const editor=readFileSync(new URL('../sheets.jsx',import.meta.url),'utf8')
 assert.match(editor,/Erschöpfung durch Krankheit/)
})
