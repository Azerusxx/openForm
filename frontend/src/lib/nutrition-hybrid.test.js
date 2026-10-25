import { describe, it, expect } from 'vitest'
import { relevantFoods, hybridFoodSearch } from './nutrition-hybrid.js'

const food = name => ({ name, barcode:'123', per100:{kcal:100,protein:5,carbs:10,fat:3} })
describe('hybrid food search', () => {
  it('rejects irrelevant Open Food Facts matches', () => {
    expect(relevantFoods('Big Mac Menü',[food('Fromage Blanc Nature'),food('Big Mac Menü')]).map(f=>f.name)).toEqual(['Big Mac Menü'])
  })
  it('keeps relevant database matches without calling AI', async () => {
    let calls = 0
    const result = await hybridFoodSearch('Skyr Natur', { search:async()=>[food('Skyr Natur')],estimate:async()=>{calls++;return food('fake')} })
    expect(result.estimated).toBe(false)
    expect(calls).toBe(0)
  })
  it('falls back to AI when database returns unrelated foods', async () => {
    const result = await hybridFoodSearch('Big Mac Menü', { search:async()=>[food('Milch')],estimate:async()=>({...food('Big Mac Menü'),source:'ai_estimate'}) })
    expect(result.estimated).toBe(true)
    expect(result.foods[0].source).toBe('ai_estimate')
  })
  it('does not silently accept an unavailable AI result', async () => {
    await expect(hybridFoodSearch('Unbekanntes Gericht 123', { search:async()=>[],estimate:async()=>{throw new Error('nicht konfiguriert')} })).rejects.toThrow('nicht konfiguriert')
  })
})
