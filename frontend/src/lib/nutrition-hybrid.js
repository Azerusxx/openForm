// Hybrid food lookup: OFF first, configured on-device Coach provider only as fallback.
// Never writes nutrition data or stores API credentials.
import { searchFoodByName } from './nutrition.js'
import { loadCoachDevice } from './coach-device.js'
import { getApiKey } from './coach-secrets.js'
import { nativeFetch } from './capacitor-fetch.js'
import { HTTP_PROVIDERS } from '../../../api/coach/core/providers.js'

const cache = new Map()
const tokens = text => String(text || '').toLocaleLowerCase('de').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^\p{L}\p{N}]+/u).filter(x => x.length > 1)
export function relevantFoods(query, foods) {
  const terms = tokens(query)
  if (!terms.length) return []
  return foods.filter(food => {
    const name = tokens(food.name)
    return terms.every(term => name.some(word => word === term || (term.length > 4 && word.startsWith(term))))
  })
}
function validateEstimate(obj, query) {
  if (!obj || typeof obj !== 'object' || typeof obj.name !== 'string') throw new Error('Die KI hat keine gültige Mahlzeit geliefert.')
  const amount = Number(obj.grams)
  const values = ['kcal','protein','carbs','fat'].map(k => Number(obj[k]))
  if (!Number.isFinite(amount) || amount < 10 || amount > 5000 || values.some(x => !Number.isFinite(x) || x < 0)) throw new Error('Die KI-Schätzung enthält ungültige Mengen oder Nährwerte.')
  if (values[0] > 12000 || values.slice(1).some(x => x > 1000)) throw new Error('Die KI-Schätzung ist unplausibel.')
  const per100 = Object.fromEntries(['kcal','protein','carbs','fat'].map((key,i) => [key, Math.round(values[i] * 10000 / amount) / 100]))
  // Fibre is optional. A missing or implausible value stays UNKNOWN, never 0.
  const totalFiber = obj.fiber == null || obj.fiber === '' ? null : Number(obj.fiber)
  const validFiber = totalFiber !== null && Number.isFinite(totalFiber) && totalFiber >= 0 &&
    totalFiber <= amount && totalFiber <= 250
  const per100Micros = validFiber ? { fiber: Math.round(totalFiber * 10000 / amount) / 100 } : {}
  return { name: obj.name.trim().slice(0,160) || query, basis:'g', barcode:null, per100,
    per100Micros, fiberSource: validFiber ? 'ai_estimate' : null, source:'ai_estimate',
    estimatedGrams:amount, note:'KI-Schätzung für die gesamte genannte Portion; Werte pro 100 g umgerechnet. Bitte prüfen.' }
}
export async function hybridFoodSearch(query, { search = searchFoodByName, estimate = estimateFood } = {}) {
  const term = String(query || '').trim()
  if (term.length < 2) throw new Error('Bitte mindestens zwei Zeichen eingeben.')
  const key = term.toLocaleLowerCase('de')
  if (cache.has(key)) return cache.get(key)
  let foods = [], databaseError = null
  try { foods = relevantFoods(term, await search(term)) } catch (err) { databaseError = err }
  if (foods.length) return { foods, estimated:false }
  try {
    const food = await estimate(term)
    const result = { foods:[food], estimated:true }
    cache.set(key,result)
    if (cache.size > 50) cache.delete(cache.keys().next().value)
    return result
  } catch (err) {
    throw new Error('Keine passenden Datenbanktreffer. KI-Schätzung nicht verfügbar: ' + (err?.message || databaseError?.message || 'Unbekannter Fehler'))
  }
}
export async function estimateFood(query) {
  const device = await loadCoachDevice()
  if (device.mode !== 'byok' || !device.provider || !device.model) throw new Error('Bitte unter Einstellungen → KI-Coach einen Anbieter und ein Modell auf diesem Gerät einrichten.')
  const adapters = await import('./coach-local.js')
  const adapter = adapters.ADAPTERS[device.provider]
  const meta = HTTP_PROVIDERS[device.provider]
  if (!adapter || !meta) throw new Error('Dieser KI-Anbieter wird nicht unterstützt.')
  const key = await getApiKey()
  if (!key && !meta.keyOptional) throw new Error('Der API-Schlüssel fehlt.')
  const cfg = { provider:device.provider, providerOptions:device.baseUrl ? { [device.provider]:{baseUrl:device.baseUrl} } : {} }
  const env = key ? { [meta.apiKeyEnv]:key } : {}
  const result = await adapter.invoke({
    cfg,env,model:device.model,fetch:nativeFetch,timeoutMs:60000,maxTokens:650,
    system:'Du schätzt Lebensmittel-Nährwerte. Antworte ausschließlich mit einem JSON-Objekt. Erfinde keine Recherche, Herstellerangaben oder Quellen. Verwende realistische typische Portionsgrößen. Werte gelten für die gesamte genannte Portion. Keys: name (string), grams (number), kcal (number), protein (number), carbs (number), fat (number), fiber (number oder null). Ballaststoffe für die ganze Portion anhand plausibler Zutaten schätzen; falls nicht sinnvoll schätzbar, null ausgeben. Bei Unsicherheit konservativ schätzen.',
    prompt:'Schätze die gesamte verzehrte Menge und Makronährwerte für: '+query
  })
  if (result.code !== 0) throw new Error('KI-Anfrage fehlgeschlagen: '+String(result.stderr || 'Keine Antwort').slice(0,160))
  let parsed
  try { parsed = JSON.parse(String(result.text).replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'')) } catch { throw new Error('KI-Antwort war kein gültiges JSON.') }
  return validateEstimate(parsed,query)
}
