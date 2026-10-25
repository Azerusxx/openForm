import { describe, it, expect } from 'vitest'
import { nutrientOverview, supplementMicrosForDay } from './nutrient-overview.js'
const date = '2026-10-25'
const item = (key, value) => ({
  id: 'food', name: 'Food', date, quantity: 100, unit: 'g',
  per100Micros: { [key]: value }
})
const supp = (nutrients, dose = 1, logs = [date]) => ({
  id: 'supp', name: 'Supplement', dose, unit: 'piece', nutrients, logs
})
const read = (data, key) => nutrientOverview(data, date).find(r => r.key === key)

describe('micronutrient combined daily accounting', () => {
  it('adds food and consumed supplement amounts exactly once', () => {
    const result = read({ entries: [item('magnesium', 90)], supplements: [supp({ magnesium: 100 }, 2)] }, 'magnesium')
    expect(result).toMatchObject({ food: 90, supplement: 200, total: 290, limitExceeded: false })
  })
  it('does not count supplements on unchecked days', () => {
    expect(supplementMicrosForDay([supp({ vitaminD: 25 }, 2, [])], date)).toEqual({})
  })
  it('distinguishes unknown food quantities from zero', () => {
    const result = read({ entries: [item('fiber', 5)], supplements: [] }, 'vitaminD')
    expect(result.total).toBeNull()
    expect(result.assessment).toBe('unknown')
    expect(read({ entries: [item('fiber', 0)], supplements: [] }, 'fiber').total).toBe(0)
  })
  it('magnesium limit only counts supplements, not ordinary foods', () => {
    expect(read({ entries: [item('magnesium', 400)], supplements: [supp({ magnesium: 200 })] }, 'magnesium').limitExceeded).toBe(false)
    expect(read({ entries: [item('magnesium', 400)], supplements: [supp({ magnesium: 300 })] }, 'magnesium').limitExceeded).toBe(true)
  })
  it('checks total vitamin B6 and vitamin D for upper limits', () => {
    expect(read({ entries: [item('vitaminB6', 3)], supplements: [supp({ vitaminB6: 10 })] }, 'vitaminB6').limitExceeded).toBe(true)
    expect(read({ entries: [], supplements: [supp({ vitaminD: 50 }, 2)] }, 'vitaminD').limitExceeded).toBe(false)
    expect(read({ entries: [], supplements: [supp({ vitaminD: 60 }, 2)] }, 'vitaminD').limitExceeded).toBe(true)
  })
  it('does not erase nutrients when several supplements are taken', () => {
    const result = read({ entries: [], supplements: [supp({ zinc: 5 }, 1), { ...supp({ zinc: 10 }, 2), id: 'two' }] }, 'zinc')
    expect(result.supplement).toBe(25)
  })
})
