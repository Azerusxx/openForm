import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const tab=read('./TabBar.jsx'),css=read('../index.css'),home=read('../views/Home.jsx')
test('Home has no duplicate nutrition promo banner',()=>{
 assert.doesNotMatch(home,/Ernährung: Kalorien und Protein tracken|of-home-link/)
})
test('five top-level tabs retain routes and Create in middle',()=>{
 for(const item of ['label="Start"','label="Essen"','>Erstellen</span>','label="Training"','label="Profil"']) assert.ok(tab.includes(item),item)
 assert.equal((tab.match(/<Tab active=/g)||[]).length,4)
 for(const route of ['/home','/nutrition','/plan','/settings']) assert.ok(tab.includes(route),route)
 assert.match(tab,/const activeIndex = active.home \? 0 : active.nutrition \? 1 : active.plan \? 3 : active.settings \? 4/)
 assert.match(tab,/data-floating-glass/)
 assert.match(css,/width:calc\(\(100% - 12px\)\/5\)/)
})
test('central create menu routes to existing app actions',()=>{
 for(const label of ['Essen erfassen','Training starten','Rezept erstellen','Gewicht eintragen','Wasser erfassen','Übung erstellen']) assert.ok(tab.includes(label),label)
 assert.match(tab,/bwSheet\(\)/)
 assert.match(tab,/customExSheet\(null\)/)
 assert.match(tab,/onStart\(effectiveRoutineIds/)
 assert.match(tab,/aria-expanded=\{createOpen\}/)
 assert.match(css,/\.of-create-sheet/)
 assert.match(css,/min-height:84px/)
})
test('repeat active tab scrolls up and large touch targets respect reduced motion',()=>{
 assert.match(tab,/window.scrollTo/)
 assert.match(tab,/if \(loc.pathname === path && !loc.search\)/)
 assert.match(css,/min-height:48px/)
 assert.match(css,/prefers-reduced-motion:reduce/)
})
test('lost primary routes stay accessible',()=>{
 assert.match(home,/nav\('\/stats'\)/)
 const plan=read('../views/Plan.jsx')
 assert.match(plan,/nav\('\/library'\)/)
})
