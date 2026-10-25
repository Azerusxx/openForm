import {describe,it,expect} from 'vitest'
import {analyzeWeightTrend,nutritionWeekAnalysis,similarMealSuggestions} from './nutrition-analysis.js'
const e=(date,name='Toast')=>({id:date+name,date,name,quantity:100,unit:'g',basis:'g',per100:{kcal:400,protein:20,carbs:40,fat:12}})
const goals={kcal:2200,protein:150,carbs:247,fat:68}
describe('0.4.1a food and bodyweight trend quality',()=>{
 it('shows all older weights when all history is selected, without altering storage',()=>{
   const weights=[{d:'2026-08-20',w:76},{d:'2026-09-10',w:77},{d:'2026-10-23',w:77.5},{d:'2026-10-25',w:79.5}]
   expect(analyzeWeightTrend(weights,'2026-10-25',7).weights).toHaveLength(2)
   const all=analyzeWeightTrend(weights,'2026-10-25','all')
   expect(all.weights).toHaveLength(4)
   expect(all.weeklyMeans.length).toBe(3)
   expect(all.limited).toBe(true)
   expect(weights).toHaveLength(4)
 })
 it('labels single food diary day insufficient without fake zero days',()=>{
   const a=nutritionWeekAnalysis([e('2026-10-25')],'2026-10-25',goals)
   expect(a.quality).toBe('insufficient')
   expect(a.daysLogged).toBe(1)
   expect(a.average.kcal).toBe(400)
   expect(a.averageDeviation.kcal).toBe(-1800)
   expect(a.mealContributions[0].kcal).toBe(400)
 })
 it('shows similar dishes without joining their ingredients or logs',()=>{
   const meals=[e('2026-10-20','Toast mit Kabanossi'),e('2026-10-22','Toast mit Nougatcreme')]
   const hints=similarMealSuggestions(meals)
   expect(hints).toHaveLength(2)
   expect(hints[0].related.length).toBe(1)
   expect(meals).toHaveLength(2)
 })
})
