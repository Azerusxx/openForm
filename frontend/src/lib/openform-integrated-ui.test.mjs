import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
test('Home shows real nutrition totals without original promo banner', () => {
  const code = source('../views/Home.jsx')
  assert.match(code, /dayTotals\(nutrition.entries, todayISO\(\)\)/)
  assert.match(code, /of-home-summary/)
  assert.doesNotMatch(code, /Ernährung: Kalorien und Protein tracken/)
})
test('unified settings profile reuses existing weight and measures', () => {
  const code = source('../views/NutritionGoalsSettings.jsx')
  assert.match(code, /gym\.bodyweight/)
  assert.match(code, /gym\.targetW/)
  assert.match(code, /gym\.measurements/)
  assert.match(code, /\/measurements/)
  assert.match(code, /Aktivitätsniveau/)
})
test('complete backup actions coexist with legacy backup', () => {
  const code = source('../views/Settings.jsx')
  assert.match(code, /createCompleteBackup/)
  assert.match(code, /parseCompleteBackup/)
  assert.match(code, /onClick=\{doCompleteExport\}/)
  assert.match(code, /onClick=\{doExport\}/)
  assert.match(code, /completeRef\.current/)
})
