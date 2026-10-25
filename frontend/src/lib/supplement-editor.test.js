import { describe, it, expect } from 'vitest'
import { cleanSupplements } from './nutrition-extra.js'
import { nutrientOverview } from './nutrient-overview.js'

describe('0.4.0b supplement ingredient handling', () => {
  const date = '2026-10-25'
  const supplement = (name,nutrients,dose=1) => ({
    id:name, name, dose, unit:'piece', nutrients, logs:[date]
  })
  it('retains several substances in one Omega-3 product', () => {
    const data={entries:[], supplements:cleanSupplements([supplement('Omega 3',{epa:360,dha:240})])}
    const rows=nutrientOverview(data,date)
    expect(rows.find(n=>n.key==='epa').total).toBe(360)
    expect(rows.find(n=>n.key==='dha').total).toBe(240)
  })
  it('stores creatine in grams and not as magnesium', () => {
    const data={entries:[],supplements:cleanSupplements([supplement('Kreatin',{creatine:3})])}
    const rows=nutrientOverview(data,date)
    expect(rows.find(n=>n.key==='creatine').total).toBe(3)
    expect(rows.find(n=>n.key==='magnesium').total).toBeNull()
  })
  it('preserves existing entries without automatically changing old magnesium amounts', () => {
    const old=supplement('Kreatin alt',{magnesium:1},12)
    expect(cleanSupplements([old])[0].nutrients).toEqual({magnesium:1})
  })
})
