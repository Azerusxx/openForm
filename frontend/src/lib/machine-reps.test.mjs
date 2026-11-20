import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MachineRepDetector } from './machine-reps.js'

const signal = (reps, { period = 2200, doublePulse = false, quiet = false } = {}) => {
  const pulses = Array.from({length:reps},(_,i)=>doublePulse?[300 + i*period,1200 + i*period]:[300 + i*period]).flat()
  const samples=[]
  for(let t=0;t<=reps*period+200;t+=40) {
    const noise=Math.sin(t/190)*.04
    const a=quiet?noise:noise+pulses.reduce((sum,center)=>sum + Math.max(0,4*(1-Math.abs(t-center)/190)),0)
    samples.push({t,x:a,y:0,z:0})
  }
  return samples
}
const calibrated = options => {
  const sensor=new MachineRepDetector()
  for(const sample of signal(3,options)) sensor.collect(sample)
  const result=sensor.finishCalibration()
  assert.equal(result.ok,true,JSON.stringify(result))
  return sensor
}

test('counts controlled single-pulse machine repetitions after 3-rep calibration',()=>{
  const sensor=calibrated()
  assert.ok(sensor.calibration.periodMs > 1600)
  assert.ok(sensor.start())
  for(const sample of signal(8)) sensor.push(sample)
  assert.equal(sensor.stop(),8)
  assert.equal(sensor.running,false)
})

test('does not double count machine movements with up/down acceleration pulses',()=>{
  const sensor=calibrated({doublePulse:true})
  assert.ok(sensor.start())
  for(const sample of signal(8,{doublePulse:true})) sensor.push(sample)
  assert.equal(sensor.stop(),8)
})

test('quiet/noisy still phone cannot pass calibration or generate reps',()=>{
  const sensor=new MachineRepDetector()
  for(const sample of signal(3,{quiet:true})) sensor.collect(sample)
  assert.equal(sensor.finishCalibration().ok,false)
  assert.equal(sensor.start(),false)
  assert.equal(sensor.push({t:1000,x:30,y:0,z:0}),0)
})

test('rejects invalid samples and stops at a finite count, never counting while stopped',()=>{
  const sensor=calibrated()
  assert.equal(sensor.push({t:500,x:30,y:0,z:0}),0)
  assert.ok(sensor.start())
  assert.equal(sensor.push({t:1000,x:NaN,y:0,z:0}),0)
  assert.equal(sensor.push({t:1000,x:90,y:0,z:0}),0)
  for(const sample of signal(5)) sensor.push(sample)
  assert.equal(sensor.stop(),5)
  for(const sample of signal(5)) sensor.push(sample)
  assert.equal(sensor.count,5)
})

test('rep counter is opt-in, Android native, restricted to machines and cannot auto-complete sets',()=>{
 const workout=readFileSync(new URL('../views/Workout.jsx',import.meta.url),'utf8')
 const sheet=readFileSync(new URL('../components/RepCounterSheet.jsx',import.meta.url),'utf8')
 const native=readFileSync(new URL('../../android/app/src/main/java/ch/duartesantos/opengym/RepMotionPlugin.java',import.meta.url),'utf8')
 const main=readFileSync(new URL('../../android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java',import.meta.url),'utf8')
 assert.match(workout,/Wiederholungen per Handy-Sensor/)
 assert.match(workout,/supportedMachine = \/cable\|lever\|machine/)
 assert.match(workout,/onApply: reps => onField\(sensorSetIdx, 'r', reps\)/)
 assert.match(sheet,/row\.r !== initialReps/)
 assert.match(sheet,/!row \|\| row\.done/)
 assert.match(sheet,/Ich habe eine sichere Befestigung geprüft/)
 assert.match(sheet,/phase === 'review'/)
 assert.match(native,/TYPE_LINEAR_ACCELERATION/)
 assert.match(native,/handleOnStop/)
 assert.match(main,/registerPlugin\(RepMotionPlugin\.class\)/)
 assert.doesNotMatch(sheet,/\.done\s*=\s*true|\.workouts\s*=/)
})
