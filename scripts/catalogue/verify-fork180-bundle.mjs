#!/usr/bin/env node
// Verify only opt-in, licensed 180px openGym fork media, using the ORIGINAL exercise IDs.
// This checker is read-only: never touches workouts, routines, or stored sets.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {EXDB} from '../../frontend/src/lib/exercises-data.js'

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const front=path.join(ROOT,'frontend')
const mapping=JSON.parse(fs.readFileSync(path.join(front,'src/lib/fork180-image-map.json'),'utf8'))
const clipMapping=JSON.parse(fs.readFileSync(path.join(front,'src/lib/fork180-clip-map.json'),'utf8'))
const ids=new Set(EXDB.map(e=>String(e.id)))
const publicDir=path.join(front,'public/exercise-media/fork180')
const distDir=path.join(front,'dist/exercise-media/fork180')
const repdb=JSON.parse(fs.readFileSync(path.join(front,'src/lib/repdb-image-map.json'),'utf8'))
// A retained empty legacy JSON file must not be imported or packaged.
if(Object.keys(repdb).length) {
  console.warn('::warning::Legacy RepDB map exists in source, but must not be imported by the app.')
}
const src=fs.readFileSync(path.join(front,'src/components/Media.jsx'),'utf8')
const ex=fs.readFileSync(path.join(front,'src/lib/exercises.js'),'utf8')
if(/REPDB_IMAGE_MAP|repdb-image-map/.test(src+ex))throw Error('RepDB image source still active in UI')
const media=fs.readFileSync(path.join(front,'src/lib/media-url.js'),'utf8')
if(!media.includes('fork180') || !media.includes('exerciseClipUrl'))throw Error('OpenGym still/clip URL resolvers missing')
const files=Object.entries(mapping)
for(const [id,file] of files){
  if(!ids.has(id))throw Error('Unknown openGym exercise ID: '+id)
  if(!/^[a-z0-9_-]+\.webp$/i.test(file))throw Error('Invalid filename: '+file)
  for(const dir of [publicDir,distDir]) {
    if(!fs.existsSync(path.join(dir,file)))throw Error('Missing authorized illustration: '+id+'/'+file+' in '+dir)
  }
}
if(files.length){
  for(const dir of [publicDir,distDir])if(!fs.existsSync(path.join(dir,'NOTICE.md')))throw Error('Attribution missing from '+dir)
  const notice=fs.readFileSync(path.join(publicDir,'NOTICE.md'),'utf8')
  if(!/Gym visual|Aliaksandr Makatserchyk/i.test(notice))throw Error('Original copyright notice missing')
}
const clips=Object.entries(clipMapping)
for(const [id,file] of clips){
  if(!ids.has(id))throw Error('Unknown original exercise ID in clip map: '+id)
  if(!/^[a-z0-9_-]+\.(mp4|webp)$/i.test(file))throw Error('Invalid clip filename: '+file)
  for(const dir of [publicDir,distDir]){
    const filename=path.join(dir,'clip',file)
    if(!fs.existsSync(filename) || !fs.statSync(filename).size) throw Error('Authorized clip missing: '+id+'/'+file+' in '+dir)
  }
}
if(clips.length && !files.length) console.warn('::warning::Animations are supplied without still previews.')
if(clips.length) for(const dir of [publicDir,distDir]) {
  if(!fs.existsSync(path.join(dir,'NOTICE.md')))throw Error('Missing clip copyright notice at '+dir)
}
if(fs.existsSync(path.join(front,'dist/exercise-media/repdb')))throw Error('RepDB files unexpectedly packaged')
console.log('VERIFIED: '+files.length+' authorized stills, '+clips.length+' authorized animations bound to unchanged exercise IDs. '+(!files.length&&!clips.length?'No license-approved media supplied. No replacements performed.':''))
