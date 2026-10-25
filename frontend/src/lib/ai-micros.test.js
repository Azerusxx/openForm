import { describe, it, expect } from 'vitest'
import { createEntry, normalizedNutrition } from './nutrition.js'
import { nutrientOverview } from './nutrient-overview.js'
import { dailyFiberReport } from './fiber-report.js'
const date='2026-10-25'
const entry=(name,micros,sources={})=>createEntry({
  name,date,quantity:100,unit:'g',basis:'g',
  per100:{kcal:180,protein:10,carbs:25,fat:4},per100Micros:micros,
  microsSources:sources,source:'manual'
})
describe('0.4.0h multiple AI micronutrients with per-value provenance',()=>{
  it('retains nutrient provenance through normalisation, without affecting macros',()=>{
    const food=entry('Gemüse',{fiber:4,calcium:80,vitaminC:12},{fiber:'database',calcium:'ai_estimate',vitaminC:'ai_estimate'})
    const saved=normalizedNutrition({schemaVersion:1,entries:[food]}).entries[0]
    expect(saved.microsSources).toEqual({fiber:'database',calcium:'ai_estimate',vitaminC:'ai_estimate'})
    expect(saved.per100.kcal).toBe(180)
  })
  it('separates sources by micronutrient even within one dish',()=>{
    const food=entry('Mix',{fiber:4,calcium:80,vitaminC:12},{fiber:'database',calcium:'ai_estimate',vitaminC:'ai_estimate'})
    const rows=nutrientOverview({entries:[food],supplements:[]},date)
    expect(rows.find(x=>x.key==='fiber')).toMatchObject({confirmedFood:4,estimatedFood:0})
    expect(rows.find(x=>x.key==='calcium')).toMatchObject({confirmedFood:0,estimatedFood:80})
    expect(rows.find(x=>x.key==='vitaminC')).toMatchObject({confirmedFood:0,estimatedFood:12})
    expect(dailyFiberReport([food],date).confirmed).toBe(4)
  })
  it('does not treat AI-based upper-limit guesses as confirmed toxicity alerts',()=>{
    const food=entry('Unknown vitamin-D food',{vitaminD:120},{vitaminD:'ai_estimate'})
    const row=nutrientOverview({entries:[food],supplements:[]},date).find(x=>x.key==='vitaminD')
    expect(row.limitExceeded).toBe(false)
    expect(row.estimatedExceedance).toBe(true)
  })
  it('keeps missing nutrients unknown and excludes supplement-only ingredients',()=>{
    const row=nutrientOverview({entries:[entry('Toast',{fiber:2},{fiber:'ai_estimate'})],supplements:[]},date)
    expect(row.find(x=>x.key==='iodine').total).toBeNull()
    expect(row.find(x=>x.key==='creatine').total).toBeNull()
  })
})
