// 0.4.0f: assess logged dietary fibre with source-level completeness.
// Unknown per-100g values are not zero; confirmed 0 is a known amount.
// This intentionally does not estimate fibre from food names or macro values.
import { entryMicros } from './nutrition.js'
const round = n => Math.round(n * 100) / 100
export const FIBER_DAILY_GUIDE_G = 30
export function dailyFiberReport(entries, date, guide = FIBER_DAILY_GUIDE_G) {
  const foods = (entries || []).filter(e => e?.date === date)
  const sources = []
  const missing = []
  let knownGrams = 0
  for (const entry of foods) {
    const declared = entry?.per100Micros?.fiber
    const isKnown = declared !== undefined && declared !== null && declared !== '' &&
      Number.isFinite(Number(declared)) && Number(declared) >= 0
    const fiber = isKnown ? entryMicros(entry).fiber : undefined
    const hasUsableQuantity = Number.isFinite(fiber) && fiber >= 0
    if (!hasUsableQuantity) {
      missing.push({ id: entry.id, name: entry.name, quantity: entry.quantity, unit: entry.unit })
      continue
    }
    knownGrams += fiber
    sources.push({ id: entry.id, name: entry.name, quantity: entry.quantity, unit: entry.unit,
      fiber: round(fiber), source: entry.source || 'manual' })
  }
  sources.sort((a,b) => b.fiber - a.fiber)
  const recorded = round(knownGrams)
  const target = Number.isFinite(Number(guide)) && Number(guide) > 0 ? Number(guide) : FIBER_DAILY_GUIDE_G
  return { recorded, target, remaining: round(Math.max(0,target-recorded)),
    progress: Math.min(100,Math.round(recorded/target*100)),
    sources, missing, knownCount:sources.length, unknownCount:missing.length,
    complete:missing.length===0 && foods.length>0, hasFood: foods.length>0 }
}
