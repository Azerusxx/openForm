import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanStudio, fingerprintQR, gymDeviceKey, assignedDevice, registerGymDevice, removeGymDevice } from './gym-device-pass.js'
test('same physical QR belongs to a studio, not every studio',async()=>{
 const code='https://example.com/device/leg-press?example=123'
 const hash=await fingerprintQR(code)
 assert.equal(hash.length,64)
 assert.equal(hash.includes('leg-press'),false)
 const map=registerGymDevice({}, {studio:' Studio A ',hash,exId:'leg-press',label:'Beinpresse'},100)
 assert.equal(assignedDevice(map,'Studio A',hash)?.exId,'leg-press')
 assert.equal(assignedDevice(map,'Studio B',hash),null)
 const other=registerGymDevice(map,{studio:'Studio B',hash,exId:'hack-squat'},200)
 assert.equal(assignedDevice(other,'Studio B',hash)?.exId,'hack-squat')
 assert.equal(assignedDevice(other,'Studio A',hash)?.exId,'leg-press')
 assert.equal(JSON.stringify(other).includes(code),false)
 const gone=removeGymDevice(other,gymDeviceKey('Studio A',hash),300)
 assert.equal(assignedDevice(gone,'Studio A',hash),null)
 assert.equal(assignedDevice(gone,'Studio B',hash)?.exId,'hack-squat')
})
test('rejects invalid QR and studio names',async()=>{
 assert.throws(()=>cleanStudio('  '))
 await assert.rejects(fingerprintQR(''))
 await assert.rejects(fingerprintQR('a'.repeat(5000)))
 assert.throws(()=>registerGymDevice({}, {studio:'X',hash:'abc',exId:'x'}))
})
