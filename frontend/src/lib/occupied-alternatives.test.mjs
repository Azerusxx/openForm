import test from 'node:test'
import assert from 'node:assert/strict'
import { occupiedAlternatives } from './occupied-alternatives.js'
const ex=(id,n,eq,tg='quadriceps',bp='upper legs')=>({id,n,eq,tg,bp,cat:'strength'})
test('suggests knee-dominant alternatives ahead of isolation and excludes already scheduled lifts',()=>{
 const current=ex('legpress','leg press','machine')
 const catalogue=[current,ex('hack','hack squat','machine'),ex('goblet','goblet squat','dumbbell'),ex('ext','leg extension','machine'),ex('chest','bench press','barbell','pectorals','chest')]
 const options=occupiedAlternatives(current,catalogue,['legpress','hack'])
 assert.equal(options[0].ex.id,'goblet')
 assert.ok(!options.some(x=>x.ex.id==='legpress'||x.ex.id==='hack'||x.ex.id==='chest'))
 assert.equal(options[0].reason,'Ähnliches Bewegungsmuster')
})
test('no same-muscle candidates means no deceptive recommendation',()=>{
 assert.deepEqual(occupiedAlternatives(ex('x','squat','machine'),[]),[])
})
