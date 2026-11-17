import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {postWorkoutAnalysis,nextRotationRoutine} from './post-workout-analysis.js'

const routine = (id,name,ex) => ({id,name,ex:ex.map(e=>({id:e,weight:70,reps:10}))})
const s1 = (w,r,rir,done=true) => ({w,r,rir,done})
const training = (id,d,start,routineIds,entries) => ({id,d,start,end:start+3600000,routineIds,name:'Plan '+routineIds[0],entries})
const ex = (id,sets) => ({id,target:{id,mode:'reps'},sets})
const A = training('a','2026-11-15',1000,['a'],[ex('x',[s1(75,9,1),s1(75,10,1)])])
const B = training('b','2026-11-17',2000,['b'],[ex('x',[s1(80,8,1),s1(75,10,1),s1(75,10,0.5)]),ex('y',[s1(65,10,null)])])
const state={workouts:[A,B],unit:'kg',routines:[routine('a','Plan A',['x']),routine('b','Plan B',['x','y']),routine('c','Plan C',['z'])],rotation:{sequence:['a','b','c']},customEx:[{id:'x',n:'Rudern'},{id:'y',n:'Trizeps'},{id:'z',n:'Beine'}]}
test('analysis uses only completed sets and actual reported RIR',()=>{
 const result=postWorkoutAnalysis(state,B)
 assert.equal(result.sets,4)
 assert.equal(result.rated,3)
 assert.equal(result.exercises[0].top,80)
 assert.equal(result.exercises[0].previousTop,75)
 assert.equal(result.exercises[0].lines[2].rir,0.5)
 assert.equal(result.exercises[1].avgRir,null)
})
test('next A B C is selected from stored rotation, not weekday assumptions',()=>{
 assert.equal(nextRotationRoutine(state,B).name,'Plan C')
 assert.equal(postWorkoutAnalysis(state,B).nextRoutine,'Plan C')
 assert.equal(nextRotationRoutine(state,A).name,'Plan B')
 assert.equal(nextRotationRoutine(state,{...B,routineIds:[]}),null)
 const withoutRotation={...state,rotation:null}
 assert.equal(nextRotationRoutine(withoutRotation,B)?.name,'Plan C')
})
test('unknown effort is never invented and no previous comparison is fabricated',()=>{
 const x=training('first','2026-11-17',3000,['a'],[ex('z',[{w:40,r:12,done:true}])])
 const result=postWorkoutAnalysis({...state,workouts:[x]},x)
 assert.equal(result.avgRir,null)
 assert.equal(result.rated,0)
 assert.equal(result.exercises[0].previousTop,null)
})
test('post-workout summary and AI deep-dive are wired to exact finished session',()=>{
 const sheets=readFileSync(new URL('../sheets.jsx',import.meta.url),'utf8')
 const coach=readFileSync(new URL('../views/CoachChat.jsx',import.meta.url),'utf8')
 assert.match(sheets,/postWorkoutAnalysis\(st, w\)/)
 assert.match(sheets,/Mit KI-Coach vertiefen/)
 assert.match(sheets,/encodeURIComponent\(w\.id\)/)
 assert.match(coach,/requestDebrief\(workout\.id\)/)
 assert.ok(coach.indexOf('const id = new URLSearchParams(location.search)') < coach.indexOf('if (!ready) return null'))
})
