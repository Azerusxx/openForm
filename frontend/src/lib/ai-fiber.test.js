import { describe, expect, it } from 'vitest'
import { hybridFoodSearch } from './nutrition-hybrid.js'
import { createEntry, normalizedNutrition } from './nutrition.js'
import { dailyFiberReport } from './fiber-report.js'
const date='2026-10-25'
describe('0.4.0g estimated fibre provenance and sources', () => {
  it('keeps a declared database fibre quantity untouched', async () => {
    const food = { name:'Brot',per100:{kcal:250,protein:8,carbs:50,fat:2},per100Micros:{fiber:7},source:'openfoodfacts' }
    const found = await hybridFoodSearch('Brot', {search: async () => [food], estimate: async () => {throw new Error('should not estimate')} })
    expect(found.foods[0].per100Micros.fiber).toBe(7)
    expect(found.estimated).toBe(false)
  })
  it('preserves AI provenance after saving and reloading', () => {
    const entry=createEntry({name:'Toast',quantity:150,unit:'g',date,per100:{kcal:230,protein:6,carbs:40,fat:3},per100Micros:{fiber:2.5},fiberSource:'ai_estimate',source:'ai_estimate'})
    const restored=normalizedNutrition({schemaVersion:1,entries:[entry]}).entries[0]
    expect(restored.fiberSource).toBe('ai_estimate')
    const report=dailyFiberReport([restored],date)
    expect(report).toMatchObject({recorded:3.75,estimated:3.75,confirmed:0,unknownCount:0})
  })
  it('separates known food values, estimates and unknown foods', () => {
    const base={unit:'g',unitPer100:100,quantity:100,date}
    const report=dailyFiberReport([
      {...base,id:'database',name:'Database',per100Micros:{fiber:4},fiberSource:'database'},
      {...base,id:'estimate',name:'Estimate',per100Micros:{fiber:2},fiberSource:'ai_estimate'},
      {...base,id:'unknown',name:'Unknown',per100Micros:{}}
    ],date)
    expect(report).toMatchObject({recorded:6,confirmed:4,estimated:2,unknownCount:1,complete:false})
  })
  it('does not invent a fibre quantity on legacy AI meals', () => {
    const report=dailyFiberReport([{id:'old',name:'old AI',date,quantity:150,unit:'g',per100Micros:{},source:'ai_estimate'}],date)
    expect(report).toMatchObject({recorded:0,estimated:0,unknownCount:1})
  })
})
