// Explicit, local-first meal photo analysis. The user-selected provider receives the image.
// This function never saves the picture or writes a food diary entry.
import { loadCoachDevice } from './coach-device.js'
import { getApiKey } from './coach-secrets.js'
import { nativeFetch } from './capacitor-fetch.js'
import { HTTP_PROVIDERS, baseUrlFor } from '../../../api/coach/core/providers.js'
import { MICRO_NUTRIENTS, cleanMicros } from './nutrition.js'

const INSTRUCTIONS = 'Analyze the meal photo, in German. Identify visible food and estimate the ENTIRE portion weight in grams and ENTIRE portion calories/protein/carbs/fat. Return ONLY a JSON object with fields name (string), grams, kcal, protein, carbs, fat (numbers), optionally per100Micros (object). Micros are per 100 grams, only where reasonably estimable. Allowed micronutrient keys/units: ' + MICRO_NUTRIENTS.map(n=>n.key+' '+n.unit).join(', ') + '. Do not claim precision or invent ingredients hidden in the photo. If no food is visible respond with {"error":"Kein Essen erkannt"}';

export function parseFoodPhotoAnswer(raw) {
  let obj
  try {
    obj=JSON.parse(String(raw||'').replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,''))
  } catch { throw new Error('Die KI lieferte kein gültiges JSON. Bitte ein anderes Bildmodell wählen.') }
  if (obj?.error) throw new Error(String(obj.error).slice(0,160))
  if (typeof obj?.name!=='string' || !obj.name.trim()) throw new Error('Keine Mahlzeit auf dem Foto erkannt.')
  const grams=Number(obj.grams)
  const values=['kcal','protein','carbs','fat'].map(k=>Number(obj[k]))
  if (!Number.isFinite(grams) || grams < 10 || grams > 5000 ||
      values.some(v=>!Number.isFinite(v) || v<0) || values[0]>12000 ||
      values.slice(1).some(v=>v>1000)) throw new Error('Unplausible Portions- oder Nährwertschätzung.')
  const per100=Object.fromEntries(['kcal','protein','carbs','fat'].map((k,i)=>[k,Math.round(values[i]*10000/grams)/100]))
  return {name:obj.name.trim().slice(0,160),estimatedGrams:grams,basis:'g',per100,
    per100Micros:cleanMicros(obj.per100Micros),source:'ai_photo_estimate',barcode:null}
}

export async function photoToDataUrl(file) {
  if (!file || !String(file.type).startsWith('image/')) throw new Error('Bitte ein Foto auswählen.')
  if(file.size>18*1024*1024) throw new Error('Foto zu groß (max. 18 MB).')
  const image=await createImageBitmap(file)
  try {
    const scale=Math.min(1,1280/Math.max(image.width,image.height))
    const canvas=document.createElement('canvas')
    canvas.width=Math.max(1,Math.round(image.width*scale))
    canvas.height=Math.max(1,Math.round(image.height*scale))
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height)
    return canvas.toDataURL('image/jpeg',0.78)
  } finally { image.close() }
}

export async function analyzeFoodPhoto(file,{send=nativeFetch}={}) {
  const d=await loadCoachDevice()
  if(d.mode!=='byok' || !d.provider || !d.model)
    throw new Error('Unter Einstellungen → KI-Coach zuerst einen Anbieter und ein bildfähiges Modell einrichten.')
  const meta=HTTP_PROVIDERS[d.provider]
  if(!meta) throw new Error('Der KI-Anbieter ist nicht verfügbar.')
  const apiKey=await getApiKey()
  if(!apiKey && !meta.keyOptional) throw new Error('Dem KI-Coach fehlt der API-Schlüssel.')
  const dataUrl=await photoToDataUrl(file)
  const base=baseUrlFor(d.provider,{providerOptions:d.baseUrl?{[d.provider]:{baseUrl:d.baseUrl}}:{}})
  if(!base) throw new Error('Dem KI-Coach fehlt eine API-Adresse.')
  const b64=dataUrl.slice(dataUrl.indexOf(',')+1)
  let url,headers={'Content-Type':'application/json'},body
  if(d.provider==='gemini') {
    url=base+'/v1beta/models/'+encodeURIComponent(d.model)+':generateContent'
    headers['x-goog-api-key']=apiKey
    body={contents:[{role:'user',parts:[{text:INSTRUCTIONS},{inline_data:{mime_type:'image/jpeg',data:b64}}]}],
      generationConfig:{responseMimeType:'application/json',maxOutputTokens:900}}
  } else if(d.provider==='anthropic') {
    url=base+'/v1/messages'
    headers['x-api-key']=apiKey
    headers['anthropic-version']='2023-06-01'
    body={model:d.model,max_tokens:900,messages:[{role:'user',content:[
      {type:'text',text:INSTRUCTIONS},{type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}}
    ]}]}
  } else {
    url=base.replace(/\/v1$/,'')+'/v1/chat/completions'
    if(apiKey) headers.Authorization='Bearer '+apiKey
    body={model:d.model,max_tokens:900,messages:[{role:'user',content:[
      {type:'text',text:INSTRUCTIONS},{type:'image_url',image_url:{url:dataUrl,detail:'auto'}}
    ]}]}
  }
  const res=await send(url,{method:'POST',headers,body:JSON.stringify(body)})
  const payload=await res.json().catch(()=>null)
  if(!res.ok) {
    const message=payload?.error?.message || payload?.error || 'API-Anfrage fehlgeschlagen'
    throw new Error('Fotoanalyse fehlgeschlagen ('+res.status+'): '+String(message).slice(0,180)+'. Prüfe, ob dein Modell Bilder verarbeiten kann.')
  }
  const answer=d.provider==='gemini'
    ? payload?.candidates?.[0]?.content?.parts?.map(x=>x.text||'').join('')
    : d.provider==='anthropic'
    ? payload?.content?.filter(x=>x.type==='text').map(x=>x.text).join('')
    : typeof payload?.choices?.[0]?.message?.content==='string'
    ? payload.choices[0].message.content
    : payload?.choices?.[0]?.message?.content?.map(x=>x.text||'').join('')
  if(!answer) throw new Error('Das KI-Modell hat keine Bildanalyse zurückgegeben. Unterstützt es Fotos?')
  return parseFoodPhotoAnswer(answer)
}
