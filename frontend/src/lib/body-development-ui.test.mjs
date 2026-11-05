import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('body trend card appears in stats without replacing existing weight/measurements',()=>{
 const x=read('../views/Stats.jsx')
 assert.ok(x.includes('<BodyDevelopment S={S} />'))
 assert.ok(x.includes('Body weight'))
 assert.ok(x.includes("nav('/measurements')"))
})
test('body measurements show circumference-only trend, not a body fat or physique estimate',()=>{
 const x=read('../views/Measurements.jsx')
 assert.ok(x.includes("key === 'waist' || key === 'abdomen'"))
 assert.ok(x.includes('circumferenceForecast'))
 assert.ok(x.includes('kein Nachweis von Fettverlust oder Muskelaufbau'))
})
test('weight forecast has explicit minimum data, volatility and staleness checks',()=>{
 const x=read('./body-development.js')
 for(const term of ["status:'insufficient'","status:'stale'","status:'volatile'","maxAge:21","minSpan:28","weightWeeks","goalDate"])
  assert.ok(x.includes(term),term)
})
test('body forecast is read-only and uses existing check-in formats',()=>{
 const src=read('../components/BodyDevelopment.jsx')
 assert.ok(src.includes('S.bodyweight'))
 assert.ok(src.includes('S.measurements'))
 assert.ok(src.includes('S.targetW'))
 assert.ok(!src.includes('useStore.getState().update'))
})

test('stats displays bodyweight chart only once while preserving trend forecast',()=>{
 const stats=read('../views/Stats.jsx')
 const forecast=read('../components/BodyDevelopment.jsx')
 assert.ok(stats.includes('<LineChart points={bwPts}'))
 assert.ok(stats.includes('weighInsSheet'))
 assert.ok(forecast.includes('weightForecast'))
 assert.ok(forecast.includes('weight.projected.y'))
 assert.ok(!forecast.includes('<LineChart'), 'forecast must not duplicate the bodyweight chart')
})
