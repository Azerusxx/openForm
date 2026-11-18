import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL(path,import.meta.url),'utf8')

test('original OpenGym catalog and A/B/C routine IDs are never rewritten for pictures',()=>{
 const stage=source('../../../scripts/catalogue/stage-fork180.mjs')
 const verify=source('../../../scripts/catalogue/verify-fork180-bundle.mjs')
 assert.match(stage,/import \{ EXDB \}/)
 assert.match(stage,/map\[ex\.id\]=f/)
 assert.match(verify,/new Set\(EXDB\.map\(e=>String\(e\.id\)\)\)/)
 assert.doesNotMatch(stage,/\.routines\s*=|\.workouts\s*=|\.active\s*=|localStorage\.setItem|S\(\)/)
})
test('RepDB cannot replace exercises or reappear as media fallback',()=>{
 const media=source('../components/Media.jsx')
 const exercises=source('./exercises.js')
 const workflow=source('../../../.github/workflows/android-apk.yml')
 assert.doesNotMatch(media+exercises,/REPDB_IMAGE_MAP|repdb-image-map/)
 assert.doesNotMatch(workflow,/git clone .*RepDB\/exercise-dataset/)
 assert.match(workflow,/RepDB-Bilder duerfen nicht mehr in der APK sein/)
})
test('missing approved image yields no replacement rather than deleting an exercise',()=>{
 const exercises=source('./exercises.js')
 assert.match(exercises,/export const imgSrc =/)
 assert.match(exercises,/export const gifSrc =/)
 assert.match(exercises,/FORK180_IMAGE_MAP\[ex\?\.id\]/)
 assert.match(exercises,/: null/)
})

test('historical restore reads only own Git blobs, never rewrites workout plans',()=>{
 const restoration=source('../../../scripts/catalogue/recover-fork180-history.mjs')
 assert.match(restoration,/git\(\[['"]/)
 assert.match(restoration,/rev-list/)
 assert.match(restoration,/catalogue\/media\//)
 assert.match(restoration,/OPENFORM_NONCOMMERCIAL_FORK_RESTORE/)
 assert.doesNotMatch(restoration,/github\.com|https:\/\/|git clone|localStorage|\.routines\s*=|\.workouts\s*=/)
 const workflow=source('../../../.github/workflows/android-apk.yml')
 assert.match(workflow,/fetch-depth: 0/)
 assert.match(workflow,/recover-fork180-history\.mjs/)
})
