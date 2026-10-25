import test from 'node:test'
import assert from 'node:assert/strict'
import {weightWeeks,weightForecast,circumferenceForecast} from './body-development.js'
const today='2026-10-25'
const weigh=(values)=>values.map(([d,w],i)=>({d,w,t:i+1}))
test('less than 4 distinct weeks or fewer than 28 days never produces a weight prediction',()=>{
 assert.equal(weightForecast(weigh([['2026-10-03',77],['2026-10-10',76],['2026-10-17',75]]),today).status,'insufficient')
 assert.equal(weightForecast(weigh([['2026-10-01',77],['2026-10-03',75],['2026-10-10',76],['2026-10-17',75]]),today).status,'insufficient')
})
test('4+ spaced weeks allow short-range trend and conditional weight target date',()=>{
 const readings=weigh([['2026-09-13',79],['2026-09-20',78.5],['2026-09-27',78],['2026-10-04',77.5],['2026-10-11',77],['2026-10-18',76.5]])
 const x=weightForecast(readings,today,{goal:75})
 assert.equal(x.status,'ready')
 assert.ok(x.perWeek<0)
 assert.ok(x.projected.lower<x.projected.y&&x.projected.y<x.projected.upper)
 assert.match(x.goalDate,/^2026-/)
 assert.equal(weightForecast(readings,today,{goal:85}).goalDate,null)
})
test('weight unit label is preserved and pounds goal uses same scale',()=>{
 const readings=weigh([['2026-09-13',176],['2026-09-20',175],['2026-09-27',174],['2026-10-04',173],['2026-10-11',172],['2026-10-18',171]])
 const x=weightForecast(readings,today,{unit:'lb',goal:169})
 assert.equal(x.status,'ready')
 assert.equal(x.unit,'lb')
 assert.ok(x.projected.lower>100)
})
test('duplicates, future, impossible and stale readings do not invent certainty',()=>{
 const r=weigh([['2026-08-01',80],['2026-08-08',79.7],['2026-08-15',79.4],['2026-08-22',79.1]])
 assert.equal(weightForecast(r,today).status,'stale')
 assert.equal(weightForecast(weigh([['2026-09-01',77],['2026-09-08',69],['2026-09-15',90],['2026-09-22',76],['2026-10-18',77]]),today).status,'volatile')
 const w=weightWeeks(weigh([['2026-10-12',77],['2026-10-12',76],['2026-10-26',60],['2026-10-13',0],['2026-10-14',800]]),today)
 assert.equal(w.length,1)
 assert.equal(w[0].n,1)
 assert.equal(w[0].y,76)
})
test('waist and abdomen show cautious trends but never infer body fat or a date for sixpack',()=>{
 const m=[{d:'2026-09-01',waist:90,abdomen:92},{d:'2026-09-20',waist:89,abdomen:91},{d:'2026-10-18',waist:87.5,abdomen:90}]
 const w=circumferenceForecast(m,'waist',today)
 assert.equal(w.status,'ready')
 assert.ok(w.perWeek<0)
 assert.equal(w.goalDate,null)
 assert.equal(circumferenceForecast(m,'bodyFat',today).status,'not-supported')
 assert.equal(circumferenceForecast([{d:'2026-10-18',waist:87.5}],'waist',today).status,'insufficient')
})
test('unit conversion for stored centimetres is read-only and handles missing measurements',()=>{
 const rows=[{d:'2026-09-01',waist:90},{d:'2026-09-20',waist:89},{d:'2026-10-18',waist:88}]
 const cm=circumferenceForecast(rows,'waist',today)
 const inc=circumferenceForecast(rows,'waist',today,{unit:'in'})
 assert.equal(cm.status,'ready');assert.equal(inc.status,'ready')
 assert.ok(Math.abs(cm.latest.y/2.54-inc.latest.y)<1e-9)
 assert.equal(rows[0].waist,90)
})
