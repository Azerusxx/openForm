#!/usr/bin/env node
// Fail the APK build if RepDB stills are missing, disconnected from the catalog,
// or absent from the Vite/Capacitor bundle. Do not release unverified APKs.
import fs from 'node:fs'
import path from 'node:path'
const root=path.resolve(import.meta.dirname,'../..')
const mapping=JSON.parse(fs.readFileSync(path.join(root,'frontend/src/lib/repdb-image-map.json'),'utf8'))
const publicDir=path.join(root,'frontend/public/exercise-media/repdb')
const distDir=path.join(root,'frontend/dist')
const ids=Object.keys(mapping)
if(ids.length<10)throw Error('RepDB mapping has fewer than 10 entries: '+ids.length)
const missing=[]
for(const [id,file] of Object.entries(mapping)){
  if(!/^[a-z0-9_-]+\.webp$/i.test(file))throw Error('Invalid filename for '+id+': '+file)
  if(!fs.existsSync(path.join(publicDir,file)))missing.push('public/'+id+':'+file)
  if(!fs.existsSync(path.join(distDir,'exercise-media/repdb',file)))missing.push('dist/'+id+':'+file)
}
if(missing.length)throw Error('Mapped RepDB files missing: '+missing.slice(0,20).join(', '))
const assetDir=path.join(distDir,'assets')
const scripts=fs.readdirSync(assetDir).filter(name=>name.endsWith('.js'))
if(!scripts.length)throw Error('No JavaScript assets in Vite output')
// The URL builder receives bucket and filename as separate arguments:
// exerciseStillUrl('repdb', filename). Vite therefore has no single literal
// "exercise-media/repdb/" in the production JS. Checking that concatenated
// string rejected valid bundles before Capacitor could package them.
// Instead, verify that the actual mapped filenames survive bundling and the
// runtime URL resolver is present. The filesystem checks above cover every file.
const chunks=scripts.map(name=>fs.readFileSync(path.join(assetDir,name),'utf8'))
const bundle=chunks.join('\\n')
const filenames=[...new Set(Object.values(mapping))]
const embedded=filenames.filter(file=>bundle.includes(JSON.stringify(file))||bundle.includes(file))
if(embedded.length < Math.min(10,filenames.length)){
 throw Error('RepDB image map missing from compiled JavaScript: '+embedded.length+'/'+filenames.length+' mapped filenames found')
}
if(!bundle.includes('exercise-media/') || !bundle.includes('repdb')){
 throw Error('Exercise image URL resolver missing from compiled JavaScript')
}
console.log('VERIFIED: '+ids.length+' mapped exercises, '+filenames.length+' image files in public/ and dist/, '+embedded.length+' image filenames linked in '+scripts.length+' JS assets')
