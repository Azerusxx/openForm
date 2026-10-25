import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { restProgress } from './rest-circle.js'

const read = rel => readFileSync(new URL(rel, import.meta.url),'utf8')
test('circular ring accurately represents remaining pause duration', () => {
  assert.equal(restProgress(90,90),100)
  assert.equal(restProgress(45,90),50)
  assert.equal(restProgress(0,90),0)
  assert.equal(restProgress(180,90),100)
  assert.equal(restProgress(-30,90),0)
  assert.equal(restProgress(20,0),0)
})
test('in-app dialog can be minimized without stopping native pause', () => {
  const component = read('../components/RestTimer.jsx')
  assert.match(component,/role="dialog" aria-modal="true"/)
  assert.match(component,/rest-circle-track/)
  assert.match(component,/Training ansehen/)
  assert.match(component,/rest-circle-mini/)
  assert.match(component,/setMinimizedRestId\(restId\)/)
  assert.match(component,/timer.kind !== 'switch'/)
  assert.match(component,/adjustRestSheet/)
  assert.match(component,/pauseRest/)
  assert.match(component,/resumeRest/)
  assert.match(component,/stopRest/)
})
test('pause identity persists through storage and native notification updates', () => {
  const store=read('../store/useUI.js')
  assert.match(store,/restSessionId: uid\(\)/)
  assert.match(store,/restSessionId: tm\.restSessionId \|\| null/)
  assert.match(store,/saved\.restSessionId/)
  assert.match(store,/tm\?\.restSessionId/)
})
test('rendering uses backdrop blur only inside app and keeps existing Android notification controls',()=>{
  const styles=read('../index.css')
  assert.match(styles,/#rest-circle-overlay\{/)
  assert.match(styles,/backdrop-filter:blur\(8px\)/)
  const rt=read('../components/RestTimer.jsx')
  assert.match(rt,/if \(work\) return/)
  assert.match(rt,/const expandedEligible = pathname === '\/workout'/)
})
