#!/usr/bin/env node
// Stage RepDB free-tier stills into the Android app during CI, not into git.
// Never change openForm exercise IDs or silently guess ambiguous exercise variants.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = path.resolve(process.argv[2] || '')
const json = JSON.parse(fs.readFileSync(path.join(source, 'exercises.json'), 'utf8'))
const normalize = s => String(s ?? '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const equipmentAlias = {
  'body weight': 'bodyweight', 'bodyweight': 'bodyweight',
  'leverage machine': 'machine', 'sled machine': 'machine',
  'smith machine': 'smith machine', 'cable': 'cable',
  'ez barbell': 'barbell', 'olympic barbell': 'barbell',
}
const equipment = x => equipmentAlias[normalize(x)] || normalize(x)
const nameTokens = s => normalize(s).split(' ').filter(Boolean).sort().join(' ')
const catalog = Array.isArray(json.exercises) ? json.exercises : []
const byName = new Map()
for (const entry of catalog) {
  for (const name of [entry.name_en, entry.name_de]) {
    for (const key of [normalize(name), nameTokens(name)]) {
      if (!key) continue
      const set = byName.get(key) || new Set()
      set.add(entry)
      byName.set(key, set)
    }
  }
}
const mediaDir = path.join(ROOT, 'frontend/public/exercise-media/repdb')
fs.mkdirSync(mediaDir, { recursive: true })
// Compare the full catalogs. Prefer exact names. Only accept other matches
// when token similarity is extremely high and equipment agrees.
const synonyms = new Map([
  ['hyperextension', 'back extension'],
  ['lat pulldown', 'lat pull down'],
  ['seated cable row', 'cable seated row'],
  ['romanian deadlift', 'rdl'],
  ['triceps pushdown', 'triceps pressdown'],
  ['leg curl', 'hamstring curl'],
  ['leg extension', 'knee extension'],
])
const clean = value => {
  let x = normalize(value).replace(/\b45 degree\b/g, '45')
    .replace(/\bdegrees\b/g, 'degree')
    .replace(/\blying\b/g, 'prone')
  for (const [from, to] of synonyms) if (x === from) x = to
  return x
}
const tokens = value => new Set(clean(value).split(' ').filter(Boolean))
const jaccard = (a,b) => {
  const A=tokens(a), B=tokens(b)
  const common=[...A].filter(t=>B.has(t)).length
  return common/Math.max(1,A.size+B.size-common)
}
const variantWords = /\b(single|one|two|alternating|reverse|incline|decline|flat|wide|close|neutral|underhand|overhand|standing|seated|lying|prone|supine|assisted|weighted|smith|cable|dumbbell|barbell|kettlebell|machine|band|45|90)\b/g
const variants = x => new Set(clean(x).match(variantWords)||[])
const compatibleVariant = (a,b) => {
  const av=variants(a),bv=variants(b)
  // These distinctions must not be silently mixed.
  const groups=[['incline','decline','flat'],['seated','standing','lying','prone','supine'],['wide','close','neutral','underhand','overhand'],['assisted','weighted'],['dumbbell','barbell','kettlebell','cable','smith','machine','band']]
  return groups.every(g => {
    const x=g.filter(v=>av.has(v)), y=g.filter(v=>bv.has(v))
    return !x.length || !y.length || x.some(v=>y.includes(v))
  })
}
const mapping = {}
const copied = new Set()
const unmatched = []
const ambiguous = []
const accepted = []
for (const exercise of EXDB) {
  const key=clean(exercise.n)
  const eq=equipment(exercise.eq)
  const candidates=[]
  for (const entry of catalog) {
    const targetEq=equipment(entry.equipment)
    // Reject clearly different machines, implements and loading.
    if (eq && targetEq && eq !== targetEq) continue
    let best=0, matchName=''
    for (const name of [entry.name_en,entry.name_de]) {
      const label=clean(name)
      if (!label || !compatibleVariant(exercise.n,name)) continue
      const score=key===label ? 1 : nameTokens(key)===nameTokens(label) ? .99 : jaccard(key,label)
      if (score>best) {best=score;matchName=name}
    }
    if(best>=.84) candidates.push({entry,score:best,matchName})
  }
  candidates.sort((x,y)=>y.score-x.score)
  const top=candidates[0], runner=candidates[1]
  // Unique, highly convincing name match; ambiguous near-equals remain unmapped.
  if (!top || top.score<.86 || (runner && top.score-runner.score<.08)) {
    const info={id:exercise.id,name:exercise.n,equipment:exercise.eq,
      suggestions:candidates.slice(0,3).map(c=>({name:c.entry.name_en,id:c.entry.id,score:+c.score.toFixed(3)}))}
    ;(top?ambiguous:unmatched).push(info)
    continue
  }
  const illustration=top.entry.images?.flat
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
  accepted.push({id:exercise.id,name:exercise.n,repdbId:top.entry.id,repdbName:top.entry.name_en,score:+top.score.toFixed(3),images})
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
fs.writeFileSync(path.join(ROOT,'repdb-coverage.json'),JSON.stringify(report,null,2)+'\\n')
console.log('RepDB coverage:', JSON.stringify({ mapped: report.mappedExercises, total: report.catalogSize, files: report.imageFiles, unmatched: report.unmatchedCount, ambiguous: report.ambiguousCount }))
console.log('Unmatched sample:', JSON.stringify(unmatched.slice(0, 12)))
if (report.mappedExercises < 10) throw Error('Insufficient matching free exercise images')
