// A QR is an opaque identifier, never a URL to open or a credential to send.
export function cleanStudio(name) {
 const value=String(name||'').trim().replace(/\s+/g,' ').slice(0,80)
 if(!value)throw Error('Bitte zuerst das Fitnessstudio benennen.')
 return value
}
export async function fingerprintQR(value) {
 const raw=String(value||'')
 if(!raw || raw.length>4096)throw Error('Ungültiger oder zu langer QR-Code.')
 if(!globalThis.crypto?.subtle || !globalThis.TextEncoder)throw Error('Sicherer QR-Abgleich ist auf diesem Gerät nicht verfügbar.')
 const bytes=new TextEncoder().encode(raw)
 const digest=await crypto.subtle.digest('SHA-256',bytes)
 return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')
}
export function gymDeviceKey(studio,hash) {
 return cleanStudio(studio).toLocaleLowerCase('de')+'|'+hash
}
export function assignedDevice(map,studio,hash) {
 const row=map?.[gymDeviceKey(studio,hash)]
 return row?.exId && typeof row.exId==='string' ? row : null
}
export function registerGymDevice(map,{studio,hash,exId,label},now=Date.now()){
 if(!/^[0-9a-f]{64}$/.test(hash)||!String(exId||'').trim())throw Error('Gerätecode oder Übungszuordnung fehlt.')
 const clean=cleanStudio(studio)
 const key=gymDeviceKey(clean,hash)
 return {...(map||{}),[key]:{studio:clean,exId:String(exId),label:String(label||'').trim().slice(0,100),_ts:now}}
}
export function removeGymDevice(map,key,now=Date.now()){
 return {...(map||{}),[key]:{_ts:now}}
}
