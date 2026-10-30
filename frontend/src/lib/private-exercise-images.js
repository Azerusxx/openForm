// Private device-only pictures for built-in exercises, keyed by stable exercise ID.
// Never uploaded to the openForm server, GitHub or shared plan exports.
const DB='openform-private-exercise-images', STORE='images'
const MAX=8*1024*1024
const listeners=new Set()
const notify=()=>{ for(const cb of listeners) cb() }
export const subscribePrivateExerciseImages=cb=>{listeners.add(cb);return()=>listeners.delete(cb)}
function database(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1)
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE)
  request.onsuccess=()=>resolve(request.result)
  request.onerror=()=>reject(request.error)
 })
}
async function transact(mode,callback){
 const db=await database()
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode), store=tx.objectStore(STORE)
  let result
  const req=callback(store)
  req.onsuccess=()=>{result=req.result}
  tx.oncomplete=()=>resolve(result)
  tx.onerror=()=>reject(tx.error)
  tx.onabort=()=>reject(tx.error||new Error('Image transaction aborted'))
 })}finally{db.close()}
}
const key=id=>String(id??'')
export async function getPrivateExerciseImage(id){return await transact('readonly',store=>store.get(key(id)))||null}
export async function hasPrivateExerciseImage(id){return !!(await getPrivateExerciseImage(id))}
export async function savePrivateExerciseImage(id,file){
 if(!id||!file||!file.type?.startsWith('image/'))throw Error('Bitte eine Bilddatei auswählen.')
 if(file.size>MAX)throw Error('Bild ist größer als 8 MB.')
 // Decode to a normalized WebP; prevent huge camera photos from inflating backups.
 const bitmap=await createImageBitmap(file)
 try{
  const ratio=Math.min(1,1200/Math.max(bitmap.width,bitmap.height))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(bitmap.width*ratio))
  canvas.height=Math.max(1,Math.round(bitmap.height*ratio))
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height)
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84))
  if(!blob)throw Error('Bild konnte nicht verarbeitet werden.')
  await transact('readwrite',store=>store.put(blob,key(id)))
  notify()
 }finally{bitmap.close()}
}
export async function removePrivateExerciseImage(id){
 await transact('readwrite',store=>store.delete(key(id)))
 notify()
}
const toBase64=blob=>new Promise((resolve,reject)=>{
 const reader=new FileReader()
 reader.onload=()=>resolve(String(reader.result).split(',')[1])
 reader.onerror=()=>reject(reader.error)
 reader.readAsDataURL(blob)
})
export async function exportPrivateExerciseImages(){
 const db=await database()
 let items
 try{items=await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),store=tx.objectStore(STORE)
  const rows=[],req=store.openCursor()
  req.onsuccess=()=>{const cur=req.result;if(cur){rows.push([cur.key,cur.value]);cur.continue()}else resolve(rows)}
  req.onerror=()=>reject(req.error)
 })}finally{db.close()}
 const images=[]
 for(const [id,blob] of items)images.push({id,mime:'image/webp',data:await toBase64(blob)})
 return {kind:'openform-private-exercise-images',version:1,exportedAt:new Date().toISOString(),images}
}
export async function importPrivateExerciseImages(data){
 const value=typeof data==='string'?JSON.parse(data):data
 if(value?.kind!=='openform-private-exercise-images'||value.version!==1||!Array.isArray(value.images))throw Error('Ungültiges Übungsbilder-Backup.')
 let count=0
 for(const item of value.images){
  if(!item||typeof item.id!=='string'||!/^[a-zA-Z0-9_-]+$/.test(item.id)||typeof item.data!=='string'||item.data.length>MAX*2)throw Error('Ungültiger Bildeintrag.')
  const binary=atob(item.data),bytes=new Uint8Array(binary.length)
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)
  const blob=new Blob([bytes],{type:'image/webp'})
  if(blob.size>MAX)throw Error('Bildeintrag zu groß.')
  await transact('readwrite',store=>store.put(blob,item.id))
  count++
 }
 notify()
 return count
}

export async function listPrivateExerciseImageIds(){
 return await transact('readonly',store=>store.getAllKeys())
}
