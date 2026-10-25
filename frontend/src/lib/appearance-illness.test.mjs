import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { complementaryAccent, applyAccent, contrast, THEMES } from './accent.js'
import { ACCENTS } from './format.js'
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8')
test('complementary illness hue changes with every preset and custom colour',()=>{
 const picks=Object.keys(ACCENTS)
 const variants=picks.map(k=>complementaryAccent(k,'dark'))
 assert.equal(new Set(variants).size, picks.length)
 assert.notEqual(complementaryAccent('#ff9500','dark'),complementaryAccent('#40c8e0','dark'))
 assert.equal(complementaryAccent('INVALID','dark'),complementaryAccent('lime','dark'))
})
test('complement stays visible over page and card in dark and light appearance',()=>{
 for(const theme of ['dark','light'])for(const value of [...Object.keys(ACCENTS),'#123456','#f9f9f9','#808080','#ffffff','#000000']){
  const actual=complementaryAccent(value,theme)
  assert.match(actual,/^#[0-9a-f]{6}$/i)
  for(const bg of THEMES[theme].bgs)
   assert.ok(contrast(actual,bg)>=2.99,`${theme}, ${value}, ${actual} on ${bg}`)
 }
})
test('changing theme and accent recomputes illness CSS without persisting settings',()=>{
 const properties={}
 const root={dataset:{},style:{setProperty:(k,v)=>{properties[k]=v},removeProperty:k=>delete properties[k]}}
 applyAccent(root,'orange','dark')
 const first=properties['--illness-color']
 applyAccent(root,'teal','light')
 assert.notEqual(properties['--illness-color'],first)
 assert.equal(root.dataset.accent,'teal')
 applyAccent(root,'#cc33aa','dark')
 assert.equal(root.dataset.accent,'custom')
 assert.match(properties['--illness-color'],/^#[0-9a-f]{6}$/)
})
test('activity heatmap marks sickness-only and sickness+workout separately',()=>{
 const source=read('../components/Heatmap.jsx')
 for(const phrase of ["illnessOnDay(S, key, todayISO())","' illness-workout'","' illness'","hm-illness-key","Training + krank","onDay?.(key)"])
  assert.ok(source.includes(phrase),phrase)
 const styles=read('../index.css')
 assert.match(styles,/\.hm-c\.illness:not\(\.illness-workout\)/)
 assert.match(styles,/\.hm-c\.illness\.illness-workout/)
 assert.match(styles,/inset 0 0 0 2px var\(--illness-color\)/)
})
test('food tab and nutrition controls follow the global accent, not a fixed orange',()=>{
 const styles=read('../index.css')
 const nutrition=read('../views/Nutrition.css')
 assert.match(styles,/#tabbar button\.food \.cir\{\s*background:var\(--food-accent\)/)
 assert.match(styles,/#tabbar button\.food span\{color:var\(--food-accent\)/)
 assert.ok(nutrition.includes('--of-teal:var(--food-accent)'))
 assert.ok(nutrition.includes('color:var(--food-on-accent)'))
 assert.ok(!nutrition.includes('var(--orange)'))
})
