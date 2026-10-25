import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('calendar marks sick periods separately, without destroying workouts',()=>{
 const src=read('../sheets.jsx')
 for(const phrase of ['illnessOnDay(st, iso, todayISO())',"dotCls = sickness ? 'sick'","illnessSheet(iso, illness?.id)",'Krankmeldung & Wiedereinstieg','Krankmeldung speichern'])assert.ok(src.includes(phrase),phrase)
 assert.ok(src.includes('workoutDetailSheet'))
})
test('start and home provide a route to sickness registration',()=>{
 assert.match(read('../views/Workout.jsx'),/Krank melden \/ Trainingspause/)
 assert.match(read('../views/Home.jsx'),/Krank gemeldet/)
 assert.match(read('../views/Home.jsx'),/Wiedereinstieg/)
})
test('no forced return dates and no automatic training clearance',()=>{
 const editor=read('../sheets.jsx')
 assert.match(editor,/Das geplante Datum ist keine medizinische Freigabe/)
 assert.match(editor,/Mindestens 24 Stunden fieberfrei/)
 assert.match(editor,/Brustschmerz/)
 const src=read('./illness.js')
 assert.match(src,/if\(!checks\)/)
})
test('sick periods excuse reminders and missed-day nudges',()=>{
 assert.match(read('./day-notes.js'),/illnessOnDay/)
 assert.match(read('../../../api/nudge.js'),/illnessPeriods/)
})
