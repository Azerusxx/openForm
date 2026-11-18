#!/usr/bin/env node
// Stage RepDB free-tier stills into the Android app during CI, not into git.
// Never change openForm exercise IDs or silently guess ambiguous exercise variants.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'
import { matchRepdbExercise } from './repdb-matcher.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = path.resolve(process.argv[2] || '')
const json = JSON.parse(fs.readFileSync(path.join(source, 'exercises.json'), 'utf8'))
const catalog = Array.isArray(json.exercises) ? json.exercises : []
const mediaDir = path.join(ROOT, 'frontend/public/exercise-media/repdb')
fs.mkdirSync(mediaDir, { recursive: true })
// Purge generated files from earlier local builds before re-staging the active set.
for(const name of fs.readdirSync(mediaDir)) if(/^[a-z0-9_-]+\\.webp$/i.test(name)) fs.rmSync(path.join(mediaDir,name))
const mapping = {}
const copied = new Set()
const unmatched = []
const ambiguous = []
const accepted = []
for (const exercise of EXDB) {
  const match=matchRepdbExercise(exercise,catalog)
  if(match.kind!=='exact'){
    const info={id:exercise.id,name:exercise.n,equipment:exercise.eq,
      suggestions:match.candidates.map(c=>({name:c.entry.name_en,id:c.entry.id,score:c.score/100}))}
    ;(match.kind==='review'?ambiguous:unmatched).push(info)
    continue
  }
  const top=match.entry
  const illustration=top.images?.flat
  const files=[illustration?.start,illustration?.peak,illustration?.main].filter(Boolean)
  const images=[]
  for (const file of files) {
    if (!(file.startsWith('images/flat/') && file.endsWith('.webp') && !file.includes('..') && /^[a-z0-9_-]+[.]webp$/i.test(path.basename(file)))) continue
    const from=path.resolve(source,file)
    if (!from.startsWith(source+path.sep)||!fs.existsSync(from)) throw Error('Missing RepDB image: '+file)
    const filename=path.basename(file)
    fs.copyFileSync(from,path.join(mediaDir,filename))
    copied.add(filename)
    images.push(filename)
  }
  if (!images.length) {unmatched.push({id:exercise.id,name:exercise.n,reason:'no licensed still'});continue}
  mapping[exercise.id]=images[0]
  accepted.push({id:exercise.id,name:exercise.n,repdbId:top.id,repdbName:top.name_en,score:1,images})
}
// Reviewed exact exercise-id overrides. Do not apply loose global synonyms:
// openForm #5813 is a 45-degree bodyweight hyperextension with arms at chest,
// corresponding to RepDB's bench back-extension illustration.
const reviewedOverrides = { '5813': 'back-extension' }
for (const [id, repdbId] of Object.entries(reviewedOverrides)) {
  const entry = catalog.find(e => e.id === repdbId)
  const exercise = EXDB.find(e => e.id === id)
  if (!entry || !exercise) throw Error('Reviewed exercise override missing: '+id+' => '+repdbId)
  const file = entry.images?.flat?.start || entry.images?.flat?.main
  if (!file || !file.startsWith('images/flat/') || !file.endsWith('.webp')) throw Error('Invalid reviewed illustration: '+repdbId)
  const filename=path.basename(file)
  fs.copyFileSync(path.join(source,file),path.join(mediaDir,filename))
  copied.add(filename)
  mapping[id]=filename
  accepted.push({id,name:exercise.n,repdbId,repdbName:entry.name_en,score:1,images:[filename],reviewed:true})
}
const target = path.join(ROOT, 'frontend/src/lib/repdb-image-map.json')
fs.writeFileSync(target, JSON.stringify(mapping, null, 2) + '\n')
const report = {catalogSize:EXDB.length,repdbSize:catalog.length,
 mappedExercises:Object.keys(mapping).length,imageFiles:copied.size,
 unmatchedCount:unmatched.length,ambiguousCount:ambiguous.length,
 accepted,unmatched,ambiguous}
fs.writeFileSync(path.join(ROOT,'repdb-coverage.json'),JSON.stringify(report,null,2)+'\n')
console.log('RepDB coverage:', JSON.stringify({ mapped: report.mappedExercises, total: report.catalogSize, files: report.imageFiles, unmatched: report.unmatchedCount, ambiguous: report.ambiguousCount }))
console.log('Unmatched sample:', JSON.stringify(unmatched.slice(0, 12)))
if (report.mappedExercises < 10) throw Error('Insufficient matching free exercise images')
