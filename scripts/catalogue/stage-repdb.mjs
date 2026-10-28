#!/usr/bin/env node
// Build-time only: free RepDB illustrations, never commit third-party image collection.
// Usage: node scripts/catalogue/stage-repdb.mjs /tmp/repdb-exercise-dataset
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = path.resolve(process.argv[2] || '')
const data = JSON.parse(fs.readFileSync(path.join(source, 'exercises.json'), 'utf8'))
const normal = s => String(s || '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const byName = new Map()
for (const item of data.exercises || []) {
  const key = normal(item.name_en)
  if (!key) continue
  const list = byName.get(key) || []
  list.push(item)
  byName.set(key, list)
}
const outDir = path.join(ROOT, 'frontend/public/exercise-media/repdb')
fs.mkdirSync(outDir, { recursive: true })
const mapping = {}
const used = new Set()
let ambiguous = 0
for (const ex of EXDB) {
  const matches = byName.get(normal(ex.n)) || []
  // Never guess for competing variants; a wrong exercise picture is unsafe.
  const candidates = matches.filter(x => !ex.eq || !x.equipment || normal(x.equipment) === normal(ex.eq))
  if (candidates.length !== 1) { if (candidates.length > 1) ambiguous++; continue }
  const img = candidates[0].images?.flat
  const file = img?.start || img?.main || img?.peak
  if (!file || !/^images\/flat\/[a-z0-9_-]+\.webp$/i.test(file)) continue
  const src = path.join(source, file)
  if (!fs.existsSync(src)) throw new Error('Missing RepDB illustration: ' + file)
  const name = path.basename(file)
  fs.copyFileSync(src, path.join(outDir, name))
  used.add(name)
  mapping[ex.id] = name
}
fs.writeFileSync(path.join(ROOT, 'frontend/src/lib/repdb-image-map.json'), JSON.stringify(mapping, null, 2) + '\n')
console.log('RepDB: matched ' + Object.keys(mapping).length + ' openForm exercises, '+used.size+' unique images; ambiguous '+ambiguous)
if (Object.keys(mapping).length < 10) throw new Error('Too few exact RepDB exercise matches; review mapping before release')
