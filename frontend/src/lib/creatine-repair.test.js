import { describe, expect, it } from 'vitest'
import { isMisattributedCreatine, repairMisattributedCreatine } from './creatine-repair.js'
import { nutrientOverview } from './nutrient-overview.js'
const date = '2026-10-25'
const legacy = { id: 'old-1', name: 'Kreatin', dose: 12, unit: 'g', nutrients: { magnesium: 1 }, logs: [date, '2026-10-24'] }
describe('explicit creatine attribution repair', () => {
  it('recognises only the precise old creatine / magnesium typo', () => {
    expect(isMisattributedCreatine(legacy)).toBe(true)
    expect(isMisattributedCreatine({ ...legacy, name: 'Magnesium' })).toBe(false)
    expect(isMisattributedCreatine({ ...legacy, nutrients: { magnesium: 1, creatine: 1 } })).toBe(false)
    expect(isMisattributedCreatine({ ...legacy, nutrients: { magnesium: 2 } })).toBe(false)
  })
  it('preserves the dose and all historical checkmarks', () => {
    const fixed = repairMisattributedCreatine(legacy)
    expect(fixed).toMatchObject({ id: 'old-1', dose: 12, unit: 'g', logs: [date, '2026-10-24'], nutrients: { creatine: 1 } })
    expect(legacy.nutrients).toEqual({ magnesium: 1 })
  })
  it('drops false magnesium attribution immediately after the repair', () => {
    const before = nutrientOverview({ entries: [], supplements: [legacy] }, date)
    const after = nutrientOverview({ entries: [], supplements: [repairMisattributedCreatine(legacy)] }, date)
    expect(before.find(x=>x.key === 'magnesium').total).toBe(12)
    expect(after.find(x=>x.key === 'magnesium').total).toBeNull()
    expect(after.find(x=>x.key === 'creatine').total).toBe(12)
  })
})
