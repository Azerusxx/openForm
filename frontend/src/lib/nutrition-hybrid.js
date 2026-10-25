// Hybrid food lookup: OFF first, configured on-device Coach provider only as fallback.
// Never writes nutrition data or stores API credentials.
import { searchFoodByName, MICRO_NUTRIENTS } from './nutrition.js'
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
  // Every micronutrient is optional; never turn omitted fields into zero.
  // AI replies describe total amounts for the requested serving in the units
  // listed in MICRO_NUTRIENTS. The map is explicit to prevent unit confusion.
  const candidates = { ...(obj.micros && typeof obj.micros === 'object' ? obj.micros : {}) }
  if (obj.fiber !== undefined && candidates.fiber === undefined) candidates.fiber = obj.fiber
  const per100Micros = {}
  const microsSources = {}
  for (const nutrient of MICRO_NUTRIENTS) {
    if (['creatine','omega3','epa','dha'].includes(nutrient.key)) continue
    const raw = candidates[nutrient.key]
    if (raw == null || raw === '') continue
    const value = Number(raw)
    const maxPer100 = nutrient.key === 'fiber' ? 100
      : nutrient.key === 'sodium' || nutrient.key === 'potassium' ? 50000
      : nutrient.unit === 'µg' ? 200000 : 10000
    const per100Value = value * 100 / amount
    if (!Number.isFinite(value) || value < 0 || !Number.isFinite(per100Value) ||
        per100Value > maxPer100) continue
    per100Micros[nutrient.key] = Math.round(per100Value * 100) / 100
    microsSources[nutrient.key] = 'ai_estimate'
  }
  return { name: obj.name.trim().slice(0,160) || query, basis:'g', barcode:null, per100,
    per100Micros, microsSources, fiberSource: microsSources.fiber || null, source:'ai_estimate',
    estimatedGrams:amount, note:'KI-Schätzung je Nährstoff; Werte pro 100 g umgerechnet. Fehlende Felder bleiben unbekannt. Bitte prüfen.' }
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
    cfg,env,model:device.model,fetch:nativeFetch,timeoutMs:60000,maxTokens:1250,
    system:'Du schätzt Nährwerte aus plausiblen Zutaten und Portionsgrößen. Antworte NUR mit EINEM JSON-Objekt, ohne erfundene Herstellerdaten oder erfundene Quellen. name (string), grams (number), kcal (number), protein (number), carbs (number), fat (number), micros (object). Alle Mengen beziehen sich auf die GESAMTE Portion. micros: optionale numerische Werte oder null, Schlüssel fiber (g), sodium (mg), calcium (mg), iron (mg), magnesium (mg), potassium (mg), vitaminC (mg), vitaminD (µg), vitaminA (µg), vitaminE (mg), vitaminB1 (mg), vitaminB2 (mg), vitaminB6 (mg), vitaminB12 (µg), folate (µg), zinc (mg), iodine (µg), selenium (µg). Keine Kreatin-, EPA-, DHA- oder Omega3-Schätzwerte. Nur begründbar schätzbare Nährstoffe liefern. Unklare Werte null oder weglassen, niemals aus Makros mathematisch ableiten. Vorsichtig und ohne Scheingenauigkeit.',
    prompt:'Schätze die gesamte verzehrte Menge und Makronährwerte für: '+query
  })
  if (result.code !== 0) throw new Error('KI-Anfrage fehlgeschlagen: '+String(result.stderr || 'Keine Antwort').slice(0,160))
  let parsed
  try { parsed = JSON.parse(String(result.text).replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'')) } catch { throw new Error('KI-Antwort war kein gültiges JSON.') }
  return validateEstimate(parsed,query)
}
