import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'

const STAGER = fileURLToPath(new URL('./stage-fork180.mjs', import.meta.url))
const exercise = EXDB.find(ex => typeof ex.img === 'string' && /^[a-z0-9_-]+\.webp$/i.test(ex.img))
assert.ok(exercise, 'Expected a named still in the exercise catalogue')

function webp(animated = false) {
  const b = Buffer.alloc(30)
  b.write('RIFF', 0); b.writeUInt32LE(22, 4); b.write('WEBP', 8); b.write('VP8X', 12)
  b.writeUInt32LE(10, 16); b[20] = animated ? 0x02 : 0x00
  b[24] = 99; b[27] = 99 // 100 x 100 pixels
  return b
}
function mp4() {
  const b = Buffer.alloc(24)
  b.writeUInt32BE(24, 0); b.write('ftyp', 4); b.write('isom', 8)
  return b
}
function fixture(clipFile, alternateDrawing = null, sourceExercise = exercise) {
  const root = mkdtempSync(path.join(tmpdir(), 'openform-media-test-'))
  const source = path.join(root, 'source')
  mkdirSync(path.join(root,'frontend/src/lib'), {recursive:true})
  mkdirSync(path.join(root,'frontend/public'), {recursive:true})
  mkdirSync(path.join(source, 'still'), {recursive:true})
  mkdirSync(path.join(source, 'clip'), {recursive:true})
  writeFileSync(path.join(source,'NOTICE.md'), '© Aliaksandr Makatserchyk, Gym visual - test fixture\n')
  writeFileSync(path.join(source,'still',sourceExercise.img), webp())
  if (clipFile) writeFileSync(path.join(source,'clip',clipFile), clipFile.endsWith('.mp4') ? mp4() : webp(true))
  if (alternateDrawing) {
    writeFileSync(path.join(source,'still',alternateDrawing+'.webp'),webp())
    writeFileSync(path.join(source,'clip',alternateDrawing+'.mp4'),mp4())
  }
  const env = {...process.env, NODE_ENV:'test', OPENFORM_MEDIA_TEST_ROOT:root,
    OPENFORM_FORK180_SOURCE:source, OPENFORM_FORK180_LICENSE_CONFIRMED:'1',
    OPENFORM_FORK180_CLIPS_LICENSE_CONFIRMED:'1'}
  const run = overrides => execFileSync(process.execPath,[STAGER],{env:{...env,...overrides},encoding:'utf8',stdio:'pipe'})
  const map = filename => JSON.parse(readFileSync(path.join(root,'frontend/src/lib',filename),'utf8'))
  return {root,source,run,map,remove:()=>rmSync(root,{recursive:true,force:true})}
}

test('licensed 180px still and animated WebP are staged locally by original exercise ID',()=>{
  const name=exercise.id+'.webp',f=fixture(name)
  try{
    f.run()
    assert.equal(f.map('fork180-image-map.json')[exercise.id],exercise.img)
    assert.equal(f.map('fork180-clip-map.json')[exercise.id],name)
    const dir=path.join(f.root,'frontend/public/exercise-media/fork180')
    assert.deepEqual(readFileSync(path.join(dir,exercise.img)),webp())
    assert.deepEqual(readFileSync(path.join(dir,'clip',name)),webp(true))
    assert.ok(existsSync(path.join(dir,'NOTICE.md')))
  }finally{f.remove()}
})

test('separately licensed MP4 animation is packaged unchanged',()=>{
  const name=exercise.id+'.mp4',f=fixture(name)
  try{
    f.run()
    assert.equal(f.map('fork180-clip-map.json')[exercise.id],name)
    assert.deepEqual(readFileSync(path.join(f.root,'frontend/public/exercise-media/fork180/clip',name)),mp4())
  }finally{f.remove()}
})

test('animation files are rejected without explicit clip authorization',()=>{
  const f=fixture(exercise.id+'.webp')
  try{
    assert.throws(()=>f.run({OPENFORM_FORK180_CLIPS_LICENSE_CONFIRMED:'0'}),/status 1|Command failed|EPERM|EACCES/i)
    assert.equal(existsSync(path.join(f.root,'frontend/public/exercise-media/fork180/clip')),false)
  }finally{f.remove()}
})

test('no source never creates a false positive media mapping',()=>{
  const f=fixture()
  try{
    f.run({OPENFORM_FORK180_LICENSE_CONFIRMED:'0',OPENFORM_FORK180_CLIPS_LICENSE_CONFIRMED:'0',OPENFORM_FORK180_SOURCE:''})
    assert.deepEqual(f.map('fork180-image-map.json'),{})
    assert.deepEqual(f.map('fork180-clip-map.json'),{})
    assert.deepEqual(f.map('fork180-figure-map.json'),{})
  }finally{f.remove()}
})

test('gender variants are mapped only when the separately approved original files exist',()=>{
 const selected=EXDB.find(ex=>(ex.mv || ex.fv) && typeof ex.img==='string')
 assert.ok(selected,'Catalogue should have an exercise with a separate drawing')
 const gender=selected.fv ? 'female' : 'male'
 const drawing=selected.fv || selected.mv
 const f=fixture(selected.id+'.mp4',drawing,selected)
 try {
   f.run()
   assert.equal(f.map('fork180-figure-map.json')[selected.id][gender].still,drawing+'.webp')
   assert.equal(f.map('fork180-figure-map.json')[selected.id][gender].clip,drawing+'.mp4')
   assert.ok(existsSync(path.join(f.root,'frontend/public/exercise-media/fork180',drawing+'.webp')))
   assert.ok(existsSync(path.join(f.root,'frontend/public/exercise-media/fork180/clip',drawing+'.mp4')))
 }finally{f.remove()}
})
