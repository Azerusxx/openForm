import {describe,it,expect} from 'vitest'
import {createCompleteBackup,parseCompleteBackup,backupManifest,verifyBackupRoundTrip,verifyNutritionRestore} from './openform-backup.js'
import {createEntry, normalizedNutrition} from './nutrition.js'
import {activityEnergy} from './activity-energy.js'
const day='2026-10-25'
const training={workouts:[{id:'workout-1'}],routines:[{id:'routine-1'}],bodyweight:[{d:day,w:77}]}
const food=createEntry({name:'Brokkoli',date:day,quantity:100,unit:'g',per100:{kcal:30,protein:3,carbs:5,fat:0.5},per100Micros:{fiber:3.5},microsSources:{fiber:'ai_estimate'}})
const activity={id:'activity-1',date:day,...activityEnergy({type:'walk',minutes:40,weightKg:77})}
const nutrition=normalizedNutrition({schemaVersion:1,entries:[food],water:{[day]:500},activities:[activity],favorites:[{id:'fav-1',food}],recipes:[{id:'recipe-1',name:'Brokkoli',items:[food],servings:1}],supplements:[{id:'supp-1',name:'Magnesium',dose:1,unit:'piece',nutrients:{magnesium:200},logs:[day]}],goals:{kcal:2200,protein:150},profile:{includeActivityCalories:false}})
describe('0.4.3 complete data backup regression',()=>{
 it('round-trips train, weight, nutrition, activities and supplement data',()=>{
  const result=verifyBackupRoundTrip(training,nutrition)
  expect(result.ok).toBe(true)
  expect(result.manifest).toMatchObject({workouts:1,bodyweight:1,entries:1,activities:1,water:1,goals:true})
 })
 it('detects missing supplement or meal after restore',()=>{
  const missing={...nutrition,supplements:[],entries:[]}
  const test=verifyNutritionRestore(nutrition,missing)
  expect(test.ok).toBe(false)
  expect(test.missing.join(',')).toMatch(/entries|supplements/)
 })
 it('backup parser rejects incomplete training rather than overwriting silently',()=>{
  const backup=createCompleteBackup(training,nutrition)
  expect(()=>parseCompleteBackup(JSON.stringify({...backup,training:{...training,routines:null}}))).toThrow()
 })
})
