import {describe,it,expect} from 'vitest'
import {ringPercent} from '../components/MacroRings.jsx'
import {readFileSync} from 'node:fs'
const jsx=readFileSync(new URL('../components/MacroRings.jsx',import.meta.url),'utf8')
const css=readFileSync(new URL('../components/MacroRings.css',import.meta.url),'utf8')
const view=readFileSync(new URL('../views/Nutrition.jsx',import.meta.url),'utf8')
describe('accent-matched nested macro rings',()=>{
 it('clamps progress, handles no goal and over-goal',()=>{
  expect(ringPercent(0,150)).toBe(0)
  expect(ringPercent(75,150)).toBe(50)
  expect(ringPercent(160,150)).toBe(100)
  expect(ringPercent(60,0)).toBe(0)
  expect(ringPercent('bad',150)).toBe(0)
 })
 it('has exactly three rings, preserving an accessible kcal center',()=>{
  expect((jsx.match(/key:'(?:carbs|fat|protein|kcal)'/g)||[])).toHaveLength(3)
  expect(jsx).not.toContain("key:'kcal'")
  expect(jsx).toContain('of-macro-ring-center')
  expect(jsx).toContain('unbekannt')
  expect(jsx).toContain("remaining<0")
  expect(jsx).toContain('strokeDashoffset')
 })
 it('gets colors from live theme accent, never hard-coded orange for macro progress',()=>{
  expect(css).toContain('var(--acc)')
  expect(css).toContain('color-mix(')
  expect(view).toContain('Kalorienbudget und Berechnung')
  expect(view).toContain('<MacroRings')
  expect(view).not.toContain('className="of-macro-cards"')
  expect(view).toContain('goals={{ ...macroGoals, kcal:(data.goals.kcal||0)+activeBonus }}')
 })
})
