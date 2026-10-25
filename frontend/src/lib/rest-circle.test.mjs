import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { restCircleProgress, shouldOpenRestCircle } from './rest-circle.js'
test('ring starts full, decreases, and ends empty without NaN', () => {
 const begin=restCircleProgress(90,90)
 const middle=restCircleProgress(45,90)
 const end=restCircleProgress(0,90)
 assert.equal(begin.remaining,100)
 assert.equal(begin.offset,0)
 assert.equal(middle.remaining,50)
 assert.ok(Math.abs(middle.offset-begin.circumference/2)<0.0001)
 assert.equal(end.remaining,0)
 assert.equal(end.offset,begin.circumference)
 assert.equal(restCircleProgress(-10,0).remaining,0)
 assert.equal(restCircleProgress(150,90).remaining,100)
})
test('overlay only for running, visible rest—not timed work or ready', () => {
 const timer={left:90,total:90}
 assert.equal(shouldOpenRestCircle({timer,minimized:false}),true)
 assert.equal(shouldOpenRestCircle({timer,minimized:true}),false)
 assert.equal(shouldOpenRestCircle({timer,work:{left:15},minimized:false}),false)
 assert.equal(shouldOpenRestCircle({timer:{...timer,ready:true},minimized:false}),false)
 assert.equal(shouldOpenRestCircle({timer:null,minimized:false}),false)
})
test('overlay retains pause, ±15, skip and edit controls', () => {
 const s=readFileSync(new URL('../components/RestTimer.jsx',import.meta.url),'utf8')
 for(const name of ['rest-circle-dialog','rest-circle-svg','rest-circle-backdrop','adjustRestSheet','addRest(-15)','addRest(15)','resumeRest','pauseRest','stopRest','Weitertrainieren'])assert.ok(s.includes(name),name)
 assert.ok(s.includes('className="working"'),'timed sets keep their existing docked timer')
})
test('rest identity persists across resumed and restored rest', () => {
 const s=readFileSync(new URL('../store/useUI.js',import.meta.url),'utf8')
 assert.match(s,/const startedAt = Date\.now\(\)/)
 assert.match(s,/startedAt: saved\.startedAt \|\| now/)
 assert.match(s,/startedAt: tm\.startedAt \|\| null/)
})
