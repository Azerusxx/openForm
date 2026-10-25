// 0.4.0a: nutrient totals and conservative safety guidance.
// A missing number is unknown, never zero. Reference values are adult orientation
// values, not personalised advice. ULs are not nutrient targets.
import { dayMicros, MICRO_NUTRIENTS } from './nutrition.js'

export const MICRO_TARGETS = {
  fiber: 30, sodium: 2000, calcium: 1000, iron: 10, magnesium: 350,
  potassium: 4000, vitaminC: 110, vitaminD: 20, vitaminA: 850,
  vitaminE: 14, vitaminB1: 1.2, vitaminB2: 1.4, vitaminB6: 1.6,
  vitaminB12: 4, folate: 300, zinc: 11, iodine: 200, selenium: 70
}

// EFSA adult tolerable upper intake levels. Not all compounds or forms are
// interchangeable. Magnesium UL applies to supplements, NOT normal food.
export const MICRO_UPPER_LIMITS = {
  magnesium: { max: 250, scope: 'supplement', source: 'EFSA/SCF 2001' },
  vitaminB6: { max: 12, scope: 'total', source: 'EFSA 2023' },
  vitaminD: { max: 100, scope: 'total', source: 'EFSA 2023' },
  selenium: { max: 255, scope: 'total', source: 'EFSA 2023' }
}
const round2 = n => Math.round(n * 100) / 100
export function supplementMicrosForDay(supplements, date) {
  const total = {}
  for (const supplement of supplements || []) {
    if (!Array.isArray(supplement?.logs) || !supplement.logs.includes(date)) continue
    const dose = Number(supplement.dose)
    if (!Number.isFinite(dose) || dose <= 0) continue
    for (const { key } of MICRO_NUTRIENTS) {
      const raw = supplement.nutrients?.[key]
      if (raw == null || raw === '') continue
      const value = Number(raw)
      if (!Number.isFinite(value) || value < 0) continue
      total[key] = round2((total[key] || 0) + value * dose)
    }
  }
  return total
}
export function nutrientOverview(data, date) {
  const foods = dayMicros(data?.entries || [], date)
  const supplements = supplementMicrosForDay(data?.supplements || [], date)
  return MICRO_NUTRIENTS.map(n => {
    const knownFood = Object.hasOwn(foods, n.key)
    const knownSupplement = Object.hasOwn(supplements, n.key)
    const known = knownFood || knownSupplement
    const total = known ? round2((foods[n.key] || 0) + (supplements[n.key] || 0)) : null
    const guide = MICRO_TARGETS[n.key] ?? null
    const upper = MICRO_UPPER_LIMITS[n.key] ?? null
    const valueForLimit = upper?.scope === 'supplement' ? supplements[n.key] : total
    const limitExceeded = upper != null && valueForLimit != null && valueForLimit > upper.max
    // A food database lacking this field cannot establish a safe total.
    const incomplete = !knownFood
    return { ...n, food: knownFood ? foods[n.key] : null,
      supplement: knownSupplement ? supplements[n.key] : null, total, known,
      guide, upper, limitExceeded, incomplete,
      assessment: limitExceeded ? 'warning' : !known ? 'unknown' : incomplete ? 'partial' : 'recorded' }
  })
}
