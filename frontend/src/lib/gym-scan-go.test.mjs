import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8')
const sheets=read('../sheets.jsx')
const workout=read('../views/Workout.jsx')
const plan=read('../views/Plan.jsx')

test('recognized device scans expose GO instead of only opening exercise details',()=>{
 assert.match(sheets,/GO – Zur Übung/)
 assert.match(sheets,/goToScannedExercise\(association\.exId\)/)
 assert.doesNotMatch(sheets,/else exerciseDetailSheet\(exOr\(association\.exId\)\)/)
 assert.match(sheets,/QR scannen &amp; GO/)
})
test('scan to GO focuses already planned exercise or adds just to running session',()=>{
 assert.match(sheets,/current\.active\.entries\.findIndex\(entry => entry\.id === exId\)/)
 assert.match(sheets,/active\.entries\.push\(newEntry\)/)
 assert.match(sheets,/active\.cur = idx/)
 assert.match(sheets,/active\.workoutView = 'cards'/)
 assert.match(sheets,/current\.active\.editingWorkoutId \|\| current\.active\.backfill/)
})
test('scan without workout uses normal freestyle and weigh-in flow',()=>{
 assert.match(sheets,/startFlow\(\[\], exId\)/)
 assert.match(sheets,/beginWorkout\(routineIds, bw, scannedExerciseId\)/)
 assert.match(sheets,/if \(scannedEntry\) entries\.push\(scannedEntry\)/)
 assert.match(sheets,/routineIds: rids/)
 assert.match(sheets,/withMeaning\(st, full, exId\)/)
})
test('entry points are available with or without a running session',()=>{
 assert.match(plan,/QR scannen & GO/)
 assert.match(workout,/QR scannen und zur Übung/)
 assert.match(workout,/gymDeviceSheet\(\)/)
})
test('studio selection is remembered but raw QR values stay out of saved state',()=>{
 assert.match(sheets,/S\(\)\.lastGymStudio/)
 assert.match(sheets,/s\.lastGymStudio = cleanStudio\(studio\)/)
 assert.match(sheets,/s\.gymDevices=registerGymDevice/)
 assert.match(sheets,/setRaw\(''\)/)
})
