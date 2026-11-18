#!/usr/bin/env node
// Restore previously retained exercise stills from *this openForm repo's own*
// earlier tracked commits. No network, upstream download, APK extraction,
// exercise remapping or state mutation. Runs only with explicit noncommercial opt-in.
// The regular stage-fork180.mjs checks image dimensions (max 180x180).
import {execFileSync} from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const git=(args,opts={})=>execFileSync('git',args,{encoding:opts.binary?undefined:'utf8',maxBuffer:128*1024*1024,stdio:['ignore','pipe','pipe']})
const mediaRoot='catalogue/media/'
const stillPrefix=mediaRoot+'still/'
const noticePath=mediaRoot+'NOTICE.md'
const output=path.resolve(process.argv[2] || path.join(os.tmpdir(),'openform-retained-media'))
const log=message=>console.log(message)
const appenv=process.env.GITHUB_ENV
const summary=process.env.GITHUB_STEP_SUMMARY
const report=message=>{log(message);if(summary)fs.appendFileSync(summary,message+'\n')}

if(process.env.OPENFORM_NONCOMMERCIAL_FORK_RESTORE!=='1'){
 report('Originalmedien-Restore nicht aktiviert; keine Medien aus fremden Quellen bezogen.')
 process.exit(0)
}

function listAt(ref){
 const raw=git(['ls-tree','-r','--name-only',ref,'--',stillPrefix])
 return raw.split('\n').filter(s=>s.startsWith(stillPrefix)&&/^[a-z0-9_-]+\.webp$/i.test(s.slice(stillPrefix.length)))
}
let found=null
const headFiles=listAt('HEAD')
if(headFiles.length)found={ref:'HEAD',files:headFiles}
if(!found){
 const revisions=git(['rev-list','--all','--',stillPrefix]).trim().split('\n').filter(Boolean)
 for(const rev of revisions){
  const files=listAt(rev)
  if(files.length){found={ref:rev,files};break}
 }
}
if(!found){
 report('⚠️ Keine versionierten openGym-Stilldateien in der eigenen openForm-Git-Historie gefunden. Möglich: Dateien waren damals nur lokal vorhanden oder wurden nie committed. Keine Übung oder A/B/C-Routine wurde verändert.')
 process.exit(0)
}
let notice
try{notice=git(['show',found.ref+':'+noticePath])}catch{
 report('⚠️ Historische Bilddateien gefunden, aber das dazugehörige NOTICE.md fehlt. Nicht automatisch einbinden.')
 process.exit(0)
}
if(!/Gym visual|Aliaksandr Makatserchyk/i.test(notice))throw Error('Historical media notice does not identify copyright holder')
fs.rmSync(output,{recursive:true,force:true})
fs.mkdirSync(path.join(output,'still'),{recursive:true})
for(const file of found.files){
 const bytes=git(['show',found.ref+':'+file],{binary:true})
 fs.writeFileSync(path.join(output,'still',path.basename(file)),bytes)
}
fs.writeFileSync(path.join(output,'NOTICE.md'),notice)
if(appenv){
 fs.appendFileSync(appenv,'OPENFORM_FORK180_SOURCE='+output+'\n')
 fs.appendFileSync(appenv,'OPENFORM_FORK180_LICENSE_CONFIRMED=1\n')
}
report('✅ '+found.files.length+' zuvor versionierte Originalbilder aus dem **eigenen** openForm-Commit '+found.ref.slice(0,12)+' wiedergefunden. Die Größenprüfung und Original-ID-Zuordnung erfolgen im nächsten Build-Schritt.')
