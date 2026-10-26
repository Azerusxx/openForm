#!/usr/bin/env node
// Fail APK builds if the exercise-media stage was accidentally skipped, or
// if any 180px exercise still/clip was lost before Capacitor packages it.
// Media licensed in catalogue/media/NOTICE.md, unchanged and never fetched.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const output = path.resolve(process.argv[2] || path.join(root, 'frontend/dist'))
const source = path.join(root, 'catalogue/media')
const folders = [['still','.webp'],['clip','.mp4']]
let hasError = false
for (const [folder,ext] of folders) {
  const from=path.join(source,folder),to=path.join(output,'exercise-media',folder)
  const list = dir => fs.existsSync(dir) ? fs.readdirSync(dir).filter(x=>x.endsWith(ext)).sort() : []
  const expected=list(from),actual=list(to)
  if (!expected.length || actual.length !== expected.length ||
      expected.some((name,i)=>name!==actual[i] ||
        fs.statSync(path.join(from,name)).size!==fs.statSync(path.join(to,name)).size)) {
    console.error('Missing or incomplete exercise media: '+folder+
      ' expected='+expected.length+' packaged='+actual.length)
    hasError = true
  } else {
    console.log('Exercise media '+folder+': '+actual.length+' files packaged')
  }
}
if (!fs.existsSync(path.join(output,'exercise-media','NOTICE.md'))) {
  console.error('Missing exercise media license notice')
  hasError=true
}
if(hasError)process.exit(1)
