import {describe,it,expect} from 'vitest'
import {ACTIVITY_CATALOG,latestWeightKg,activityEnergy,normalizeActivity,activityDaySummary,mergeImportedActivities} from './activity-energy.js'
import {normalizedNutrition} from './nutrition.js'
import {trendSeries} from './nutrition-trends.jsx'
const when='2026-10-25'
describe('0.4.2 activity energy and safe step merge',()=>{
 it('uses newest weight not future weigh-ins, and converts lb',()=>{
  const weights=[{d:'2026-10-23',w:77.5},{d:'2026-10-25',w:79.5},{d:'2026-10-26',w:92}]
  expect(latestWeightKg(weights,when)).toBe(79.5)
  expect(latestWeightKg([{d:'2026-10-23',w:176}],when,'lb')).toBe(79.8)
 })
 it('reports gross and additional net calories, never increases budget silently',()=>{
  const r=activityEnergy({type:'walk',level:1,minutes:45,weightKg:79.5})
  expect(r).toMatchObject({met:3.5,kcalGross:209,kcalNet:149,kcal:149,source:'met_estimate'})
  expect(activityEnergy({type:'walk',level:1,minutes:0,weightKg:79.5})).toBeNull()
  expect(activityEnergy({type:'walk',level:1,minutes:20,weightKg:0})).toBeNull()
 })
 it('retains historical manually logged kcal, no secret rewrite',()=>{
  const base={schemaVersion:1,entries:[],activities:[{id:'old',date:when,name:'Spaziergang',kcal:180}]}
  const n=normalizedNutrition(base)
  expect(n.activities[0]).toMatchObject({kcal:180,source:'manual_legacy',kcalNet:null})
  expect(n.profile.includeActivityCalories).toBe(false)
  expect(normalizedNutrition({...base,profile:{includeActivityCalories:true}}).profile.includeActivityCalories).toBe(true)
 })
 it('does not double count strength workout and walk exercise in activity total',()=>{
  const walk={id:'w',date:when,...activityEnergy({type:'walk',minutes:40,weightKg:79.5})}
  const strength={id:'s',date:when,...activityEnergy({type:'strength',minutes:60,weightKg:79.5})}
  const r=activityDaySummary([walk,strength],when,[{date:when}])
  expect(r.skipped).toBe(1)
  expect(r.net).toBe(walk.kcalNet)
 })
 it('deduplicates imported IDs and does not promote raw step counts to kcal',()=>{
  const sample={id:'imported',date:when,externalId:'provider:1',name:'Spaziergang',source:'health_connect',kcalNet:55,kcalGross:75}
  const a=mergeImportedActivities([], [sample,sample])
  expect(a).toHaveLength(1)
  expect(a[0].kcal).toBe(55)
 })
})
describe('0.4.2 food / weight charts',()=>{
 it('distinguishes completely absent days from actual logged values',()=>{
  const data=[{id:'1',name:'Toast',date:when,unit:'g',quantity:100,unitPer100:100,per100:{kcal:300,protein:20,carbs:35,fat:6}}]
  const w=[{d:'2026-10-23',w:77.5},{d:when,w:79.5}]
  const report=trendSeries(data,w,when,'7')
  expect(report.daily).toHaveLength(7)
  expect(report.daily.find(x=>x.date===when).kcal).toBe(300)
  expect(report.daily.find(x=>x.date==='2026-10-24').kcal).toBeNull()
  expect(report.daily.find(x=>x.date==='2026-10-23').weight).toBe(77.5)
 })
 it('keeps health data and food on same weekly time axis',()=>{
  const w=[{d:'2026-09-25',w:76},{d:when,w:79.5}]
  const r=trendSeries([],w,when,'all')
  expect(r.weekly.filter(x=>x.weight!==null).length).toBe(2)
  expect(r.weekly.every(x=>x.kcal===null)).toBe(true)
 })
})
