import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { exerciseStillUrl } from './media-url.js'

test('RepDB URL resolves to the bundled public path independent of workout route',()=>{
 const base = 'https://localhost/'
 assert.equal(exerciseStillUrl('repdb','leg-press-start.webp',base),
  'https://localhost/exercise-media/repdb/leg-press-start.webp')
 // SPA navigation must not be used as the image base.
 const source=readFileSync(new URL('../components/Media.jsx',import.meta.url),'utf8')
 assert.match(source,/exerciseStillUrl\('repdb', REPDB_IMAGE_MAP\[ex\.id\]\)/)
 assert.doesNotMatch(source,/'exercise-media\/repdb\/'.*REPDB_IMAGE_MAP/)
})
test('media asset location respects subdirectory deployments',()=>{
 assert.equal(exerciseStillUrl('fork180','row.webp','https://example.org/openform/'),
 'https://example.org/openform/exercise-media/fork180/row.webp')
})
test('untrusted media paths are not constructed',()=>{
 for(const s of ['../../foo.webp','http://evil.webp','evil.svg','a/b.webp']) {
   assert.equal(exerciseStillUrl('repdb',s,'https://localhost/'),null)
 }
 assert.equal(exerciseStillUrl('clip','some.webp','https://localhost/'),null)
})
test('legacy OpenGym paths are never returned for unlicensed built-in media',()=>{
 const source=readFileSync(new URL('./exercises.js',import.meta.url),'utf8')
 assert.match(source,/export const imgSrc =/)
 assert.match(source,/export const gifSrc =/)
 assert.doesNotMatch(source,/return IMG_BASE \+/)
 assert.doesNotMatch(source,/return GIF_BASE \+/)
})
