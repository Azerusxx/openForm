import test from 'node:test'
import assert from 'node:assert/strict'
import { qrExerciseHints, suggestQrExercises } from './gym-qr-recognition.js'

const exercises=[
 {id:'leg',n:'leg press'},
 {id:'incline',n:'incline bench press'},
 {id:'curl',n:'biceps curl'},
 {id:'lat',n:'lat pulldown'}
]

test('QR with explicit exercise name proposes a local catalog match, not an automatic assignment',()=>{
 const hints=qrExerciseHints('https://gym.example/machine?id=H7K7&exercise=leg-press')
 assert.equal(hints[0].normalized,'leg press')
 const matches=suggestQrExercises('https://gym.example/machine?id=H7K7&exercise=leg-press',exercises)
 assert.equal(matches[0].id,'leg')
 assert.equal(matches[0].score,100)
})
test('machine-name path segment and plain text label can suggest an exercise',()=>{
 assert.equal(suggestQrExercises('https://manufacturer.example/exercises/incline-bench-press',exercises)[0]?.id,'incline')
 assert.equal(suggestQrExercises('Exercise: biceps curl',exercises)[0]?.id,'curl')
})
test('opaque equipment IDs or opaque URLs do not hallucinate a machine',()=>{
 for(const qr of ['https://manufacturer.example/device/298176223987','https://example.com/?token=leg-press','https://example.com/?id=leg-press','f8e762b1de984600']){
   assert.deepEqual(suggestQrExercises(qr,exercises),[])
 }
})
test('arbitrary remote URLs are never requested or parsed for exercise content',()=>{
 assert.deepEqual(suggestQrExercises('javascript:exercise=leg-press',exercises),[])
 assert.deepEqual(suggestQrExercises('https://example.com/',exercises),[])
})
test('a vague name yields no suggestions and malformed data is bounded',()=>{
 assert.deepEqual(suggestQrExercises('https://example.com/machine/go',exercises),[])
 assert.deepEqual(qrExerciseHints('x'.repeat(5000)),[])
})
