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
const mapping = {}
const copied = new Set()
const unmatched = []
const ambiguous = []
for (const exercise of EXDB) {
  const key = normalize(exercise.n)
  const possible = new Set([...(byName.get(key) || []), ...(byName.get(nameTokens(key)) || [])])
  const matches = [...possible].filter(entry => {
    const a = equipment(exercise.eq)
    const b = equipment(entry.equipment)
    return !a || !b || a === b
  })
  if (matches.length !== 1) {
    ;(matches.length ? ambiguous : unmatched).push({ id: exercise.id, name: exercise.n, equipment: exercise.eq })
    continue
  }
  const illustration = matches[0].images?.flat
  const file = illustration?.start || illustration?.main || illustration?.peak
  if (!file || !/^images\/flat\/[a-z0-9_-]+\.webp$/i.test(file)) {
    unmatched.push({ id: exercise.id, name: exercise.n, reason: 'no free still' })
    continue
  }
  const from = path.resolve(source, file)
  if (!from.startsWith(source + path.sep) || !fs.existsSync(from)) throw Error('Missing safe RepDB file: ' + file)
  const filename = path.basename(file)
  fs.copyFileSync(from, path.join(mediaDir, filename))
  copied.add(filename)
  mapping[exercise.id] = filename
}
const target = path.join(ROOT, 'frontend/src/lib/repdb-image-map.json')
fs.writeFileSync(target, JSON.stringify(mapping, null, 2) + '\n')
const report = { catalogSize: EXDB.length, repdbSize: catalog.length,
  mappedExercises: Object.keys(mapping).length, imageFiles: copied.size,
  unmatchedCount: unmatched.length, ambiguousCount: ambiguous.length,
  unmatchedExamples: unmatched.slice(0, 80), ambiguousExamples: ambiguous.slice(0, 30) }
fs.writeFileSync(path.join(ROOT, 'repdb-coverage.json'), JSON.stringify(report, null, 2) + '\n')
console.log('RepDB coverage:', JSON.stringify({ mapped: report.mappedExercises, total: report.catalogSize, files: report.imageFiles, unmatched: report.unmatchedCount, ambiguous: report.ambiguousCount }))
console.log('Unmatched sample:', JSON.stringify(unmatched.slice(0, 12)))
if (report.mappedExercises < 10) throw Error('Insufficient matching free exercise images')
