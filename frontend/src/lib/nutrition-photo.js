// Photo meal estimate. Image is resized on-device, sent ONLY after explicit user action.
// Credentials stay in secure storage. No images are persisted or added to backups.
import { loadCoachDevice } from './coach-device.js'
import { getApiKey } from './coach-secrets.js'
import { nativeFetch } from './capacitor-fetch.js'
import { baseUrlFor } from '../../../api/coach/core/providers.js'

const PROMPT = `Analysiere nur das sichtbare Essen. Antworte auf Deutsch als reines JSON (ohne Markdown):
{"name":"Gericht","ingredients":[{"name":"Zutat","grams":120,"kcal":150,"protein":8,"carbs":22,"fat":3}],"uncertainty":"kurze Unsicherheit"}
Jede Zutat enthält eine geschätzte verzehrbare Menge in Gramm und Makronährwerte für DIESE Menge, nicht pro 100 g. Schätze auch unsichtbares Öl/Sauce nur, falls plausibel, und kennzeichne die Unsicherheit. Keine erfundenen exakten Messwerte, keine Herstellerangaben. Falls kein Essen zu erkennen ist, gib {"name":"","ingredients":[],"uncertainty":"Kein Essen erkennbar"} zurück.`

function safeJson(raw) {
  const s = String(raw || '').trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/,'')
  try { return JSON.parse(s) } catch { throw new Error('KI-Antwort enthält kein gültiges JSON.') }
}
export function validateMealPhoto(raw) {
  const value = typeof raw === 'string' ? safeJson(raw) : raw
  if (!value || !Array.isArray(value.ingredients) || !value.ingredients.length || value.ingredients.length > 25) {
    throw new Error('Auf dem Foto konnte keine verwertbare Mahlzeit erkannt werden.')
  }
  const ingredients = value.ingredients.map(v => {
    const name = String(v?.name || '').trim().slice(0,100)
    const nums = ['grams','kcal','protein','carbs','fat'].map(k => Number(v?.[k]))
    if (!name || nums.some(n => !Number.isFinite(n) || n < 0) || nums[0] < 1 || nums[0] > 3000 ||
        nums[1] > 9000 || nums.slice(2).some(n => n > 1000)) {
      throw new Error('KI hat unplausible Zutaten oder Mengen geliefert.')
    }
    return { name, grams: nums[0], kcal: nums[1], protein: nums[2], carbs: nums[3], fat: nums[4] }
  })
  if (ingredients.reduce((s,i)=>s+i.grams,0)>5000) throw new Error('Geschätzte Portion ist unplausibel groß.')
  return { name: String(value.name || 'Fotografierte Mahlzeit').trim().slice(0,150),
    ingredients, uncertainty: String(value.uncertainty || '').slice(0,350) }
}
export function photoMealTotals(ingredients) {
  const grams = ingredients.reduce((s,i)=>s+Number(i.grams || 0),0)
  const sums = Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[k,ingredients.reduce((s,i)=>s+Number(i[k] || 0),0)]))
  return { grams, ...sums, per100: Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,grams>0?Math.round(v*10000/grams)/100:0])) }
}
export function changeIngredientGrams(item, value) {
  const grams = Number(value)
  if (!Number.isFinite(grams) || grams < 0 || grams > 3000) return item
  const factor = Number(item.grams) > 0 ? grams / item.grams : 0
  return { ...item, grams, ...Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[k,Math.round(Number(item[k])*factor*10)/10])) }
}
export async function prepareMealPhoto(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Bitte ein Foto auswählen.')
  if (file.size > 20*1024*1024) throw new Error('Foto zu groß (maximal 20 MB).')
  const src = await new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Foto konnte nicht gelesen werden.'));r.readAsDataURL(file)
  })
  const img = await new Promise((resolve,reject)=>{
    const el=new Image();el.onload=()=>resolve(el);el.onerror=()=>reject(new Error('Fotoformat nicht unterstützt.'));el.src=src
  })
  const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight))
  const canvas=document.createElement('canvas')
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale))
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale))
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
  return canvas.toDataURL('image/jpeg',0.8)
}
async function checkedResponse(response) {
  if (!response.ok) {
    let msg=''
    try { const obj=await response.json();msg=String(obj?.error?.message||obj?.message||'').slice(0,160) } catch {}
    throw new Error('KI-Anfrage fehlgeschlagen (HTTP '+response.status+'). '+msg)
  }
  return response.json()
}
export async function recognizeMealPhoto(dataUrl) {
  if (!/^data:image\/jpeg;base64,/.test(dataUrl || '')) throw new Error('Ungültiges Bild.')
  const device=await loadCoachDevice()
  if (device.mode!=='byok' || !device.model || !device.provider) throw new Error('Unter Einstellungen → KI-Coach zuerst einen Bild-fähigen Anbieter und ein Modell einrichten.')
  const provider=device.provider
  if (!['openai','anthropic','gemini','compatible'].includes(provider)) throw new Error('Dieser Anbieter unterstützt die Fotoanalyse hier nicht.')
  const key=await getApiKey()
  if (!key && provider!=='compatible') throw new Error('Der API-Schlüssel für die KI fehlt.')
  const base=baseUrlFor(provider,{providerOptions:device.baseUrl?{[provider]:{baseUrl:device.baseUrl}}:{}})
  const model=device.model
  const common={method:'POST',headers:{'Content-Type':'application/json'}}
  let url,body
  if (provider==='anthropic') {
    url=base+'/v1/messages'
    common.headers['x-api-key']=key
    common.headers['anthropic-version']='2023-06-01'
    body={model,max_tokens:1800,messages:[{role:'user',content:[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:dataUrl.split(',')[1]}},{type:'text',text:PROMPT}]}]}
  } else if (provider==='gemini') {
    url=base+'/v1beta/models/'+encodeURIComponent(model)+':generateContent'
    common.headers['x-goog-api-key']=key
    body={contents:[{role:'user',parts:[{text:PROMPT},{inline_data:{mime_type:'image/jpeg',data:dataUrl.split(',')[1]}}]}],generationConfig:{temperature:0.2,maxOutputTokens:2000}}
  } else {
    url=base.replace(/\/v1\/?$/,'')+'/v1/chat/completions'
    if(key)common.headers.Authorization='Bearer '+key
    body={model,max_completion_tokens:1800,messages:[{role:'user',content:[{type:'text',text:PROMPT},{type:'image_url',image_url:{url:dataUrl}}]}]}
  }
  const response=await checkedResponse(await nativeFetch(url,{...common,body:JSON.stringify(body)}))
  const answer=provider==='anthropic' ? response.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n')
    : provider==='gemini' ? response.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n')
    : response.choices?.[0]?.message?.content
  return validateMealPhoto(answer)
}
