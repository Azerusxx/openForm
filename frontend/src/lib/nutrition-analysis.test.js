import {describe,it,expect} from 'vitest'
import {nutritionWeekAnalysis,frequentMeals} from './nutrition-analysis.js'
import {repeatMeal} from './nutrition-extra.js'
const food=(date,name,kcal=100,protein=10)=>({id:name+date,name,date,quantity:100,unit:'g',basis:'g',unitPer100:100,per100:{kcal,protein,carbs:10,fat:3},per100Micros:{fiber:4},microsSources:{fiber:'ai_estimate'},fiberSource:'ai_estimate'})
const goals={kcal:2200,protein:150,carbs:247,fat:68}
describe('0.4.1 nutrition analysis',()=>{
 it('averages only diary days and shows missing days, not fictitious fasting',()=>{
   const week=nutritionWeekAnalysis([food('2026-10-25','A',1000,160),food('2026-10-23','B',2000,140)],'2026-10-25',goals)
   expect(week.daysLogged).toBe(2)
   expect(week.average.kcal).toBe(1500)
   expect(week.loggedCoverage).toBe(28.6)
   expect(week.days.filter(d=>!d.consumed)).toHaveLength(5)
   expect(week.goalStats.protein).toEqual({met:1,evaluated:2})
   expect(week.goalStats.kcal).toEqual({met:2,evaluated:2})
   expect(week.goalStats.carbs.evaluated).toBe(0)
 })
 it('does not infer a trend from one weight measurement',()=>{
   const one=nutritionWeekAnalysis([], '2026-10-25',goals,[{d:'2026-10-23',w:76.4}])
   expect(one.weightDelta).toBeNull()
   const two=nutritionWeekAnalysis([], '2026-10-25',goals,[{d:'2026-10-20',w:76.5},{d:'2026-10-25',w:75.9}])
   expect(two.weightDelta).toBe(-0.6)
 })
 it('repeats the most recent portion and preserves AI micronutrient provenance',()=>{
   const first=food('2026-10-22','Toast',150), last={...food('2026-10-25','Toast',250),quantity:125}
   const ranks=frequentMeals([first,last,food('2026-10-20','Egg')])
   expect(ranks[0].count).toBe(2)
   expect(ranks[0].latest.quantity).toBe(125)
   const copied=repeatMeal(last,'2026-10-26')
   expect(copied.microsSources).toEqual({fiber:'ai_estimate'})
   expect(copied.fiberSource).toBe('ai_estimate')
 })
})
