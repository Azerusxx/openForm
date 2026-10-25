import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const home = readFileSync(new URL('../views/Home.jsx', import.meta.url), 'utf8')
const tab = readFileSync(new URL('./TabBar.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

test('Home has no duplicate nutrition promo banner', () => {
  assert.doesNotMatch(home, /Ernährung: Kalorien und Protein tracken|of-home-link/)
})
test('food and workout keep their separate navigation actions and icons', () => {
  assert.match(tab, /className=\{'food'/)
  assert.match(tab, /<Icon name="flame" \/>/)
  assert.match(tab, /<Icon name="dumbbell" \/>/)
  assert.match(tab, /nav\('\/nutrition'\)/)
  assert.match(css, /#tabbar button\.food \.cir/)
})
