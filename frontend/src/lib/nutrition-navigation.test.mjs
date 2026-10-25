import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const view = readFileSync(new URL('../views/Nutrition.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../views/Nutrition.css', import.meta.url), 'utf8')
test('Essen has direct food actions and secondary screens behind Mehr', () => {
  assert.match(view, /Schnell erfassen/)
  for (const label of ['Barcode', 'Suchen', 'Manuell', 'Foto-EAN']) assert.ok(view.includes(label))
  for (const tab of ['Rezepte','Analyse','Supplements']) assert.ok(view.includes(tab))
  assert.match(view, /showMore && <div id="of-more-menu"/)
  assert.match(css, /\.of-quick-actions/)
})
