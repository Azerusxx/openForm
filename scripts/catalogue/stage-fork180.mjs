#!/usr/bin/env node
// Optional non-commercial fork media packaging; never downloads/extracts Gym visual media.
// Requires an independently verified permission and a lawfully retained 180px fork source.
// No source + no opt-in: do nothing, allowing RepDB as the default.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const target = path.join(ROOT, 'frontend/src/lib/fork180-image-map.json')
const output = path.join(ROOT, 'frontend/public/exercise-media/fork180')
const enabled = process.env.OPENFORM_FORK180_LICENSE_CONFIRMED === '1'
const source = process.env.OPENFORM_FORK180_SOURCE
if (!enabled) {
  if (source) throw Error('Media source supplied without explicit license confirmation')
  fs.writeFileSync(target, '{}\n')
  console.log('No 180px fork media: using RepDB images')
  process.exit(0)
}
if (!source) throw Error('OPENFORM_FORK180_SOURCE is required for approved non-commercial fork media')
const base = path.resolve(source)
if (!fs.existsSync(path.join(base,'still')) || !fs.existsSync(path.join(base,'NOTICE.md'))) {
  throw Error('Expected original fork media/still and accompanying NOTICE.md')
}
const notice = fs.readFileSync(path.join(base,'NOTICE.md'),'utf8')
if (!/Aliaksandr Makatserchyk|Gym visual/i.test(notice)) throw Error('Original media copyright notice missing')
const safe = f => /^[a-z0-9_-]+\.webp$/i.test(f)
function dimensions(data) {
  if(data.length<30 || data.toString('ascii',0,4)!=='RIFF' || data.toString('ascii',8,12)!=='WEBP') throw Error('Not a WebP file')
  const type=data.toString('ascii',12,16)
  if(type==='VP8 ') {
    if(data.length<30 || data[23]!==0x9d || data[24]!==0x01 || data[25]!==0x2a) throw Error('Invalid VP8 frame')
    return [data.readUInt16LE(26)&0x3fff,data.readUInt16LE(28)&0x3fff]
  }
  if(type==='VP8L'){
    if(data[20]!==0x2f)throw Error('Invalid lossless WebP')
    const b0=data[21],b1=data[22],b2=data[23],b3=data[24]
    return [1+b0+((b1&0x3f)<<8),1+(b1>>6)+(b2<<2)+((b3&0x0f)<<10)]
  }
  if(type==='VP8X'){
    const u24=i=>data[i]+(data[i+1]<<8)+(data[i+2]<<16)
    return [1+u24(24),1+u24(27)]
  }
  throw Error('Unknown WebP chunk: '+type)
}
fs.mkdirSync(output,{recursive:true})
for(const file of fs.readdirSync(output))if(safe(file))fs.unlinkSync(path.join(output,file))
const map={}
let count=0
for(const ex of EXDB){
  const variants=[ex.img,ex.mv&&ex.mv+'.webp',ex.fv&&ex.fv+'.webp'].filter(Boolean)
  for(const f of variants){
    if(!safe(f))continue
    const origin=path.join(base,'still',f)
    if(!fs.existsSync(origin))continue
    const bytes=fs.readFileSync(origin)
    const [width,height]=dimensions(bytes)
    if(width<1||height<1||width>180||height>180)throw Error('Non-compliant image dimensions '+f+': '+width+'x'+height)
    fs.copyFileSync(origin,path.join(output,f))
    count++
    if(!map[ex.id])map[ex.id]=f
  }
}
if(count===0)throw Error('No eligible 180px fork images staged')
fs.copyFileSync(path.join(base,'NOTICE.md'),path.join(output,'NOTICE.md'))
fs.writeFileSync(target,JSON.stringify(map,null,2)+'\n')
console.log('Staged '+Object.keys(map).length+' exercises from lawfully retained non-commercial fork media, unmodified, max 180px')
