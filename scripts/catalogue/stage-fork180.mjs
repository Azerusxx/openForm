#!/usr/bin/env node
// Optional, licensed openGym media for a private/non-commercial openForm build.
// Does not download, scrape, or extract third-party assets. Never changes workout data.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { EXDB } from '../../frontend/src/lib/exercises-data.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const imageMapPath = path.join(ROOT, 'frontend/src/lib/fork180-image-map.json')
const clipMapPath = path.join(ROOT, 'frontend/src/lib/fork180-clip-map.json')
const output = path.join(ROOT, 'frontend/public/exercise-media/fork180')
const source = process.env.OPENFORM_FORK180_SOURCE
const stillsApproved = process.env.OPENFORM_FORK180_LICENSE_CONFIRMED === '1'
const clipsApproved = process.env.OPENFORM_FORK180_CLIPS_LICENSE_CONFIRMED === '1'
const writeMaps = (images = {}, clips = {}) => {
  fs.writeFileSync(imageMapPath, JSON.stringify(images, null, 2) + '\n')
  fs.writeFileSync(clipMapPath, JSON.stringify(clips, null, 2) + '\n')
}
if (!stillsApproved) {
  if (source || clipsApproved) throw Error('Media source/clip permission supplied without original media license confirmation')
  fs.rmSync(output, { recursive: true, force: true })
  writeMaps()
  console.warn('::warning::No approved openGym source supplied: 0 original stills or clips packaged. Exercise IDs and user data unchanged.')
  process.exit(0)
}
if (!source) throw Error('OPENFORM_FORK180_SOURCE is required for licensed media')
const base = path.resolve(source)
const stillDir = path.join(base, 'still')
const clipDir = path.join(base, 'clip')
if (!fs.existsSync(stillDir) || !fs.existsSync(path.join(base, 'NOTICE.md'))) {
  throw Error('Expected authorized source/still directory and the original NOTICE.md')
}
if (fs.existsSync(clipDir) && fs.readdirSync(clipDir).length && !clipsApproved) {
  throw Error('Clips exist, but explicit media animation reuse permission is not confirmed')
}
if (clipsApproved && !fs.existsSync(clipDir)) throw Error('Clip permission enabled but source/clip directory is missing')
const notice = fs.readFileSync(path.join(base, 'NOTICE.md'), 'utf8')
if (!/Aliaksandr Makatserchyk|Gym visual/i.test(notice)) throw Error('Original Gym visual attribution missing')
const imageName = f => typeof f === 'string' && /^[a-z0-9_-]+\.webp$/i.test(f)
const clipName = f => typeof f === 'string' && /^[a-z0-9_-]+\.(mp4|webp)$/i.test(f)
function dimensions(data) {
  if (data.length < 30 || data.toString('ascii',0,4) !== 'RIFF' || data.toString('ascii',8,12) !== 'WEBP') throw Error('Not a WebP')
  const type = data.toString('ascii',12,16)
  if (type === 'VP8 ') {
    if (data[23] !== 0x9d || data[24] !== 0x01 || data[25] !== 0x2a) throw Error('Invalid VP8')
    return [data.readUInt16LE(26)&0x3fff, data.readUInt16LE(28)&0x3fff]
  }
  if (type === 'VP8L') {
    if (data[20] !== 0x2f) throw Error('Invalid VP8L')
    return [1+data[21]+((data[22]&0x3f)<<8),1+(data[22]>>6)+(data[23]<<2)+((data[24]&0x0f)<<10)]
  }
  if (type === 'VP8X') {
    const u24 = i => data[i]+(data[i+1]<<8)+(data[i+2]<<16)
    return [1+u24(24),1+u24(27)]
  }
  throw Error('Unknown WebP chunk: '+type)
}
const readStill = f => {
  const bytes = fs.readFileSync(path.join(stillDir, f))
  const [w,h] = dimensions(bytes)
  if (w<1 || h<1 || w>180 || h>180) throw Error('180px fork still limit exceeded: '+f)
  return bytes
}
const readClip = f => {
  const bytes = fs.readFileSync(path.join(clipDir, f))
  if (!bytes.length || bytes.length>10*1024*1024) throw Error('Clip missing or exceeds 10 MB: '+f)
  if (f.toLowerCase().endsWith('.webp')) {
    const [w,h] = dimensions(bytes)
    if (w<1 || h<1 || w>180 || h>180 || bytes.toString('ascii',12,16)!=='VP8X' || !(bytes[20]&0x02)) {
      throw Error('Clip must be animated WebP within 180px: '+f)
    }
  } else if (bytes.length<12 || bytes.toString('ascii',4,8)!=='ftyp') {
    throw Error('Invalid MP4 signature: '+f)
  }
  return bytes
}
fs.rmSync(output, { recursive: true, force: true })
fs.mkdirSync(output, { recursive: true })
writeMaps()
const images = {}, clips = {}, copiedStills = new Set(), copiedClips = new Set()
for (const ex of EXDB) {
  const stillCandidates = [ex.img, ex.mv && ex.mv+'.webp', ex.fv && ex.fv+'.webp'].filter(imageName)
  for (const f of stillCandidates) {
    if (!fs.existsSync(path.join(stillDir,f))) continue
    if (!copiedStills.has(f)) {
      fs.writeFileSync(path.join(output,f),readStill(f))
      copiedStills.add(f)
    }
    if (!images[ex.id]) images[ex.id] = f
  }
  if (!clipsApproved) continue
  const ids = [ex.id,ex.mv,ex.fv].filter(Boolean)
  const candidates = [...new Set([ex.gif,...ids.flatMap(id=>[id+'.webp',id+'.mp4'])].filter(clipName))]
  for (const f of candidates) {
    if (!fs.existsSync(path.join(clipDir,f))) continue
    if (!copiedClips.has(f)) {
      fs.mkdirSync(path.join(output,'clip'), { recursive: true })
      fs.writeFileSync(path.join(output,'clip',f),readClip(f))
      copiedClips.add(f)
    }
    if (!clips[ex.id]) clips[ex.id] = f
  }
}
if (!Object.keys(images).length && !Object.keys(clips).length) throw Error('No usable licensed media files matched original exercise IDs')
fs.copyFileSync(path.join(base,'NOTICE.md'),path.join(output,'NOTICE.md'))
writeMaps(images, clips)
console.log('Licensed local fork media: '+Object.keys(images).length+' still mappings / '+Object.keys(clips).length+' animated mappings; '+copiedStills.size+' still files / '+copiedClips.size+' clips. No workout data changed.')
