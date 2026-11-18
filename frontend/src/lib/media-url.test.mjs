import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {exerciseStillUrl, exerciseClipUrl} from './media-url.js'

test('authorized openGym image URLs are stable across screen navigation',()=>{
 assert.equal(exerciseStillUrl('fork180','0027.webp','https://localhost/'),
   'https://localhost/exercise-media/fork180/0027.webp')
 const source=readFileSync(new URL('../components/Media.jsx',import.meta.url),'utf8')
 assert.match(source,/exerciseStillUrl\('fork180', stillFile\)/)
 assert.match(source,/exerciseClipUrl\('fork180', clipFile\)/)
 assert.doesNotMatch(source,/REPDB_IMAGE_MAP|repdb-image-map/)
})
test('media paths also work on subdirectory web installs',()=>{
 assert.equal(exerciseStillUrl('fork180','row.webp','https://example.org/openform/'),
   'https://example.org/openform/exercise-media/fork180/row.webp')
})
test('no accidental RepDB substitution or path traversal',()=>{
 assert.equal(exerciseStillUrl('repdb','bench.webp','https://localhost/'),null)
 for(const s of ['../../foo.webp','http://evil.webp','evil.svg','a/b.webp']){
   assert.equal(exerciseStillUrl('fork180',s,'https://localhost/'),null)
 }
})
test('built-in exercises stay unchanged when there is no authorized image',()=>{
 const ex=readFileSync(new URL('./exercises.js',import.meta.url),'utf8')
 assert.match(ex,/export const imgSrc =/)
 assert.match(ex,/export const gifSrc =/)
 assert.doesNotMatch(ex,/REPDB_IMAGE_MAP|repdb-image-map/)
 assert.doesNotMatch(ex,/return IMG_BASE \+/)
 assert.doesNotMatch(ex,/return GIF_BASE \+/)
})

test('explicitly licensed offline animations resolve only validated local paths',()=>{
 assert.equal(exerciseClipUrl('fork180','0027.mp4','https://localhost/'),
   'https://localhost/exercise-media/fork180/clip/0027.mp4')
 assert.equal(exerciseClipUrl('fork180','0027.webp','https://localhost/'),
   'https://localhost/exercise-media/fork180/clip/0027.webp')
 assert.equal(exerciseClipUrl('fork180','row.mp4','https://example.org/openform/'),
   'https://example.org/openform/exercise-media/fork180/clip/row.mp4')
 for(const name of ['../evil.mp4','a/b.mp4','https://host/x.mp4','evil.gif','evil.svg','foo.mp4?x=1']){
   assert.equal(exerciseClipUrl('fork180',name,'https://localhost/'),null)
 }
 assert.equal(exerciseClipUrl('repdb','0027.mp4','https://localhost/'),null)
})
