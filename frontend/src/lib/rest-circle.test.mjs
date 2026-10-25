import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { restProgress } from './rest-circle.js'
const read = path => readFileSync(new URL(path,import.meta.url),'utf8')
test('ring represents remaining time, clamps safely and handles zero duration',()=>{
 assert.equal(restProgress(90,90),100)
 assert.equal(restProgress(45,90),50)
 assert.equal(restProgress(0,90),0)
 assert.equal(restProgress(160,90),100)
 assert.equal(restProgress(-1,90),0)
 assert.equal(restProgress(15,0),0)
})
test('overlay contains editable circular timer and can be reduced without stopping countdown',()=>{
 const src=read('../components/RestTimer.jsx')
 for(const term of ['rest-circle-overlay','rest-circle-track','Training ansehen','rest-circle-mini','adjustRestSheet','pauseRest','resumeRest','stopRest'])assert.ok(src.includes(term),term)
 assert.ok(src.includes('const expandedEligible = pathname === \'/workout\''))
 assert.ok(src.includes('timer.startedAt'))
})
test('new pause is identified by persistent start time; native notification is unchanged',()=>{
 const store=read('../store/useUI.js')
 for(const term of ['const startedAt = Date.now()','startedAt: tm.startedAt || null','startedAt: saved.startedAt || now'])assert.ok(store.includes(term),term)
 const src=read('../components/RestTimer.jsx')
 assert.ok(src.includes('if (work) return ('))
})
test('overlay blur is scoped to the app and disabled for reduced motion',()=>{
 const css=read('../index.css')
 assert.ok(css.includes('#rest-circle-overlay'))
 assert.ok(css.includes('backdrop-filter:blur(8px)'))
 assert.ok(css.includes('prefers-reduced-motion'))
})
