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

test('floating glass indicator follows all six primary tabs without replacing navigation', () => {
  for (const expected of ["on('home') ? 0","on('plan') ? 1","on('nutrition') ? 2","cur === 'workout' ? 3","on('stats') ? 4","on('library') ? 5"]) {
    assert.ok(tab.includes(expected), expected)
  }
  assert.match(tab, /--of-active-index/)
  assert.match(tab, /data-floating-glass/)
  assert.match(tab, /aria-current=/)
  assert.match(css, /#tabbar\[data-floating-glass\]::before/)
  assert.match(css, /translateX\(calc\(var\(--of-active-index/)
})
test('glass navigation remains restrained, accessible and honors reduced motion', () => {
  assert.match(css, /#tabbar\[data-floating-glass\] button\.on:not\(\.food\):not\(\.start\) \.tab-ic/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.match(css, /transition:none!important/)
  assert.match(css, /#tabbar button\.start,#tabbar button\.food\{margin-top:-24px\}/)
  assert.match(tab, /aria-label="Hauptnavigation"/)
})
