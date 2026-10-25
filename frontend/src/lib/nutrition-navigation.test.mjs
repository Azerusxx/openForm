import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const view = readFileSync(new URL('../views/Nutrition.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../views/Nutrition.css', import.meta.url), 'utf8')
test('nutrition landing mirrors daily journal without duplicating global navigation', () => {
  for (const label of ['Frühstück','Mittagessen','Abendessen','Snacks','zugeführt','verbrannt','kcal','Wasser']) {
    assert.ok(view.includes(label) || css.includes(label), `${label} missing`)
  }
  for (const action of ['Lebensmittel suchen','Barcode scannen','Manuell eintragen','Barcode aus Foto']) assert.ok(view.includes(action))
  for (const section of ['Tagebuch','Trends','Rezepte','Favoriten','Supplements','Export / Import']) assert.ok(view.includes(section))
  assert.match(view, /of-drawer-overlay/)
  assert.doesNotMatch(view, /nav\('\/settings\/nutrition-profile'\)/)
  assert.match(view, /of-nutrients-accordion/)
  assert.match(view, /of-inline-supp-form/)
  assert.doesNotMatch(view, /showMore && <div id="of-more-menu"/)
  assert.match(css, /\.of-032 \.of-calorie-ring/)
  assert.match(css, /\.of-032 \.of-macro-cards/)
})
