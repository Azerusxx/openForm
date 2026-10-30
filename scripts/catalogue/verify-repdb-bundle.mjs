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
let linked=false
for(const name of scripts){
 const body=fs.readFileSync(path.join(assetDir,name),'utf8')
 if(body.includes('exercise-media/repdb/') && ids.some(id=>body.includes(mapping[id]))) linked=true
}
if(!linked)throw Error('Bundled JavaScript does not reference the resolved RepDB image map')
console.log('VERIFIED: '+ids.length+' mapped exercises with images in public/, dist/ and JavaScript bundle')
