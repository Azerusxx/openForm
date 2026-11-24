import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { HeightRepDetector } from './height-reps.js'

// Pressure-altitude readings: first second static, then guided weight stack
// rises and returns to the original resting height once per repetition.
const trace = (reps,{height=.65,noise=.009,period=2500}={}) => {
  const data=[]
  const initial=1200
  for(let t=0;t<=initial+period*reps+500;t+=100) {
    const cycle=(t-initial)/period
    const progress=cycle<0||cycle>=reps ? 0 : cycle%1
    const h=height*Math.sin(Math.PI*progress)**2 + noise*Math.sin(t/115) + noise*.3*Math.cos(t/41)
    data.push({t,h})
  }
  return data
}
const trained = props => {
  const d=new HeightRepDetector()
  for(const sample of trace(3,props)) d.collect(sample)
  const cal=d.finishCalibration()
  assert.equal(cal.ok,true,cal.reason)
  assert.equal(d.start(),true)
  return d
}

test('barometer counts complete bottom-to-top-to-bottom travel for a flat-mounted phone',()=>{
  const d=trained()
  for(const sample of trace(8)) d.push(sample)
  assert.equal(d.stop(),8)
})

test('short clear stroke still counts when noise allows it',()=>{
  const d=trained({height:.25})
  for(const sample of trace(6,{height:.25})) d.push(sample)
  assert.equal(d.stop(),6)
})

test('too little height travel or a stationary noisy barometer fails safely',()=>{
  for (const height of [0,.07,.15]) {
    const d=new HeightRepDetector()
    for(const point of trace(3,{height,noise:.025})) d.collect(point)
    assert.equal(d.finishCalibration().ok,false)
    assert.equal(d.start(),false)
  }
})

test('no repetition is counted until weight stack returns down',()=>{
  const d=trained()
  for(const point of trace(1).filter(s=>s.t<2450)) d.push(point)
  assert.equal(d.count,0)
  for(const point of trace(1).filter(s=>s.t>=2450)) d.push(point)
  assert.equal(d.count,1)
})

test('barometer rejects NaN, impossible height and stopped/reordered readings',()=>{
  const d=trained()
  assert.equal(d.push({t:0,h:NaN}),0)
  assert.equal(d.push({t:0,h:10}),0)
  assert.equal(d.push({t:0,h:0}),0)
  assert.equal(d.push({t:0,h:.8}),0)
  for(const point of trace(3)) d.push(point)
  assert.equal(d.stop(),3)
  for(const point of trace(3)) d.push(point)
  assert.equal(d.count,3)
})

test('Android reads real TYPE_PRESSURE height, UI exposes optional barometer mode',()=>{
  const native=readFileSync(new URL('../../android/app/src/main/java/ch/duartesantos/opengym/RepHeightPlugin.java',import.meta.url),'utf8')
  const main=readFileSync(new URL('../../android/app/src/main/java/ch/duartesantos/opengym/MainActivity.java',import.meta.url),'utf8')
  const ui=readFileSync(new URL('../components/RepCounterSheet.jsx',import.meta.url),'utf8')
  const bridge=readFileSync(new URL('./rep-height.js',import.meta.url),'utf8')
  assert.match(native,/getDefaultSensor\(Sensor\.TYPE_PRESSURE\)/)
  assert.match(native,/SensorManager\.getAltitude\(basePressure, p\)/)
  assert.match(native,/notifyListeners\("heightSample", sample\)/)
  assert.match(main,/registerPlugin\(RepHeightPlugin\.class\)/)
  assert.match(bridge,/export async function repHeightStatus/)
  assert.match(bridge,/export async function startRepHeight/)
  assert.match(ui,/Höhenmessung \(Barometer\)/)
  assert.match(ui,/Aktuelle relative Höhe/)
  assert.match(ui,/sensorMode\s*===\s*'height'\s*\?\s*heightRef\.current/)
  assert.match(ui,/sensorMode === 'height'/)
  assert.match(ui,/!row \|\| row\.done/)
  assert.doesNotMatch(native,/TYPE_MAGNETIC_FIELD|TYPE_ROTATION_VECTOR|ACCESS_FINE_LOCATION/)
  assert.doesNotMatch(ui,/\.done\s*=\s*true/)
})

test('standalone Android barometer diagnostic exposes native events and unfiltered pressure', () => {
 const native=readFileSync(new URL('../../android/app/src/main/java/ch/duartesantos/opengym/RepHeightPlugin.java',import.meta.url),'utf8')
 const bridge=readFileSync(new URL('./rep-height.js',import.meta.url),'utf8')
 const ui=readFileSync(new URL('../components/RepCounterSheet.jsx',import.meta.url),'utf8')
 assert.match(native,/@PluginMethod\s+public void diagnostics\(PluginCall call\)/)
 assert.match(native,/result\.put\("nativeSamples", nativeSamples\)/)
 assert.match(native,/result\.put\("emittedSamples", emittedSamples\)/)
 assert.match(native,/sample\.put\("p", p\)/)
 assert.match(bridge,/export async function repHeightDiagnostics\(/)
 assert.match(ui,/Sensor-Livetest/)
 assert.match(ui,/Sensor live testen/)
 assert.match(ui,/In der App empfangene Messwerte/)
 assert.match(ui,/Android-Sensorereignisse/)
 assert.match(ui,/Luftdruck:/)
 assert.match(ui,/Höhenänderung:/)
 assert.match(ui,/phase==='diagnosing'/)
 assert.match(ui,/stopStream\(\)/)
 assert.match(ui,/KALIBRIERUNG · 3 WDH\. \(NOCH KEINE ZÄHLUNG\)/)
 assert.doesNotMatch(ui,/phase==='calibrating'\?'3':count/)
})
