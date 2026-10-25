import { cleanFavorites, cleanRecipes, cleanSupplements } from './nutrition-extra.js'
// openForm nutrition v0.1: intentionally separate from gym_state_v1 until sync/merge
// and complete-backup support have been implemented and tested.
// Nutrients are optional. An absent value means UNKNOWN, not zero.
// Stored units: fiber g; sodium/calcium/iron/magnesium/potassium/vitaminC mg; vitaminD µg.
export const MICRO_NUTRIENTS = [
  { key: 'omega3', label: 'Omega-3 gesamt', unit: 'mg' },
  { key: 'epa', label: 'EPA (Omega-3)', unit: 'mg' },
  { key: 'dha', label: 'DHA (Omega-3)', unit: 'mg' },
  { key: 'fiber', label: 'Ballaststoffe', unit: 'g', off: 'fiber_100g', factor: 1 },
  { key: 'sodium', label: 'Natrium', unit: 'mg', off: 'sodium_100g', factor: 1000 },
  { key: 'calcium', label: 'Calcium', unit: 'mg', off: 'calcium_100g', factor: 1000 },
  { key: 'iron', label: 'Eisen', unit: 'mg', off: 'iron_100g', factor: 1000 },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg', off: 'magnesium_100g', factor: 1000 },
  { key: 'potassium', label: 'Kalium', unit: 'mg', off: 'potassium_100g', factor: 1000 },
  { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', off: 'vitamin-c_100g', factor: 1000 },
  { key: 'vitaminD', label: 'Vitamin D', unit: 'µg', off: 'vitamin-d_100g', factor: 1e6 },
  { key: 'vitaminA', label: 'Vitamin A', unit: 'µg', off: 'vitamin-a_100g', factor: 1e6 },
  { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', off: 'vitamin-e_100g', factor: 1000 },
  { key: 'vitaminB1', label: 'Vitamin B1', unit: 'mg', off: 'vitamin-b1_100g', factor: 1000 },
  { key: 'vitaminB2', label: 'Vitamin B2', unit: 'mg', off: 'vitamin-b2_100g', factor: 1000 },
  { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', off: 'vitamin-b6_100g', factor: 1000 },
  { key: 'vitaminB12', label: 'Vitamin B12', unit: 'µg', off: 'vitamin-b12_100g', factor: 1e6 },
  { key: 'folate', label: 'Folat', unit: 'µg', off: 'vitamin-b9_100g', factor: 1e6 },
  { key: 'zinc', label: 'Zink', unit: 'mg', off: 'zinc_100g', factor: 1000 },
  { key: 'iodine', label: 'Jod', unit: 'µg', off: 'iodine_100g', factor: 1e6 },
  { key: 'selenium', label: 'Selen', unit: 'µg', off: 'selenium_100g', factor: 1e6 },
]
export function cleanMicros(source) {
  if (!source || typeof source !== 'object') return {}
  return Object.fromEntries(MICRO_NUTRIENTS.flatMap(({key}) => {
    const v = source[key]
    return v === '' || v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0 ? [] : [[key, Number(v)]]
  }))
}
export function entryMicros(entry) {
  const size = entry.unit === 'piece' ? Number(entry.pieceSize) : 1
  const qty = Number(entry.quantity)
  if (!(size > 0 && qty > 0)) return {}
  const factor = qty * size / Number(entry.unitPer100 || 100)
  return Object.fromEntries(Object.entries(cleanMicros(entry.per100Micros)).map(([key,value]) => [key, Math.round(value * factor * 100) / 100]))
}
export function dayMicros(entries, date) {
  const sum = {}
  for (const entry of entries || []) {
    if (entry.date !== date) continue
    for (const [key,value] of Object.entries(entryMicros(entry))) sum[key] = Math.round(((sum[key] ?? 0) + value) * 100) / 100
  }
  return sum
}
export const NUTRITION_KEY = 'openform_nutrition_v1'
export const NUTRITION_VERSION = 1
export const NEW_NUTRITION = () => ({
  schemaVersion: NUTRITION_VERSION,
  goals: { kcal: 2200, protein: 150, carbs: null, fat: null },
  profile: { activity: 'moderate', waterGoal: 1900 },
  water: {},
  activities: [],
  entries: [],
  favorites: [],
  recipes: [],
  supplements: []
})
const n = x => {
  const v = typeof x === 'string' ? Number(x.replace(',', '.')) : Number(x)
  return Number.isFinite(v) && v >= 0 ? v : 0
}
const positive = x => Number.isFinite(Number(x)) && Number(x) > 0
const validDate = d => /^\d{4}-\d\d-\d\d$/.test(d)
export const dateLocal = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
export const nutrients = e => ({
  kcal: n(e?.kcal), protein: n(e?.protein), carbs: n(e?.carbs), fat: n(e?.fat)
})
export function normalizedNutrition(data) {
  const d = NEW_NUTRITION()
  if (!data || typeof data !== 'object' || data.schemaVersion !== 1 || !Array.isArray(data.entries)) return d
  d.profile = { activity: ['low', 'light', 'moderate', 'high'].includes(data.profile?.activity) ? data.profile.activity : 'moderate',
    waterGoal: positive(data.profile?.waterGoal) ? Math.min(10000, n(data.profile.waterGoal)) : 1900 }
  d.water = Object.fromEntries(Object.entries(data.water && typeof data.water === 'object' && !Array.isArray(data.water) ? data.water : {}).filter(([day, amount]) => validDate(day) && Number.isFinite(Number(amount)) && Number(amount) >= 0).map(([day, amount]) => [day, Math.min(30000, n(amount))]))
  d.activities = (Array.isArray(data.activities) ? data.activities : []).filter(a => a && typeof a.id === 'string' && validDate(a.date) && typeof a.name === 'string' && a.name.trim() && positive(a.kcal)).map(a => ({ id: a.id, date: a.date, name: a.name.trim().slice(0, 120), kcal: Math.min(10000, n(a.kcal)), createdAt: a.createdAt || 0 }))
  d.goals = {
    kcal: positive(data.goals?.kcal) ? n(data.goals.kcal) : 2200,
    protein: positive(data.goals?.protein) ? n(data.goals.protein) : 150,
    carbs: positive(data.goals?.carbs) ? n(data.goals.carbs) : null,
    fat: positive(data.goals?.fat) ? n(data.goals.fat) : null
  }
  d.entries = data.entries.filter(e => e && typeof e.id === 'string' && validDate(e.date) && typeof e.name === 'string' && positive(e.quantity) && (e.unit === 'g' || e.unit === 'ml' || e.unit === 'piece') && positive(e.unitPer100 || 100)).map(e => ({
    ...e, name: e.name.slice(0, 160), date: e.date, quantity: n(e.quantity),
    mealType: ['breakfast', 'lunch', 'dinner', 'snack', 'other'].includes(e.mealType) ? e.mealType : 'other',
    unitPer100: n(e.unitPer100 || 100), per100: nutrients(e.per100), per100Micros: cleanMicros(e.per100Micros),
    pieceSize: positive(e.pieceSize) ? n(e.pieceSize) : null,
    source: typeof e.source === 'string' ? e.source : 'manual'
  })).filter(e => e.unit !== 'piece' || positive(e.pieceSize))
  // Old alpha backups kept favorites as entry IDs; resolve them to snapshots when possible.
  const oldFavoriteIds = Array.isArray(data.favorites) ? data.favorites.filter(x => typeof x === 'string') : []
  const migratedFavorites = oldFavoriteIds.flatMap(id => {
    const meal = d.entries.find(e => e.id === id)
    return meal ? [{ id, food: meal }] : []
  })
  d.favorites = cleanFavorites([...(Array.isArray(data.favorites) ? data.favorites : []), ...migratedFavorites])
  d.recipes = cleanRecipes(data.recipes)
  d.supplements = cleanSupplements(data.supplements)
  return d
}
export const loadNutrition = (store = globalThis.localStorage) => {
  try { return normalizedNutrition(JSON.parse(store?.getItem(NUTRITION_KEY) || 'null')) }
  catch { return NEW_NUTRITION() }
}
export function saveNutrition(data, store = globalThis.localStorage) {
  const safe = normalizedNutrition(data)
  store.setItem(NUTRITION_KEY, JSON.stringify(safe))
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('openform-nutrition-changed'))
  return safe
}
// Nutrition labels must declare the base: g -> per 100g; ml -> per 100ml.
// Pieces additionally need the number of g/ml per piece, never assume that 1ml == 1g.
export function entryTotals(entry) {
  const qty = n(entry.quantity)
  const size = entry.unit === 'piece' ? n(entry.pieceSize) : 1
  if (!qty || !size) return nutrients({})
  const factor = qty * size / n(entry.unitPer100 || 100)
  const p = nutrients(entry.per100)
  return Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v * factor * 10) / 10]))
}
export function dayTotals(entries, date) {
  return (entries || []).filter(e => e.date === date).reduce((sum, e) => {
    const t = entryTotals(e)
    for (const k of Object.keys(sum)) sum[k] = Math.round((sum[k] + t[k]) * 10) / 10
    return sum
  }, nutrients({}))
}
export function createEntry({ name, quantity, unit = 'g', date = dateLocal(), per100, pieceSize = null, basis = 'g', source = 'manual', barcode = null, id = null, mealType = 'other', per100Micros = {} }) {
  const cleanName = String(name || '').trim()
  if (!cleanName || !positive(quantity) || !validDate(date) || !['g', 'ml', 'piece'].includes(unit)) throw new Error('Bitte Name und gültige Portion eingeben.')
  if (!['g', 'ml'].includes(basis) || (unit !== 'piece' && basis !== unit) || (unit === 'piece' && !positive(pieceSize))) throw new Error('Einheit und Nährwertbasis passen nicht zusammen.')
  const uid = id || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
  return { id: uid, date, name: cleanName.slice(0, 160), quantity: n(quantity), unit, basis,
    unitPer100: 100, pieceSize: unit === 'piece' ? n(pieceSize) : null,
    per100: nutrients(per100), per100Micros: cleanMicros(per100Micros), source, barcode, mealType: ['breakfast', 'lunch', 'dinner', 'snack', 'other'].includes(mealType) ? mealType : 'other', createdAt: Date.now() }
}
export function mergeNutrition(existing, imported) {
  const old = normalizedNutrition(existing), incoming = normalizedNutrition(imported)
  const entries = new Map(old.entries.map(e => [e.id, e]))
  // Existing entries win for duplicate IDs; import never silently replaces a meal.
  incoming.entries.forEach(e => { if (!entries.has(e.id)) entries.set(e.id, e) })
  const keepNew = (a, b) => { const found = new Map(a.map(v => [v.id, v])); b.forEach(v => { if (!found.has(v.id)) found.set(v.id, v) }); return [...found.values()] }
  const activities = keepNew(old.activities, incoming.activities)
  const water = { ...incoming.water, ...old.water } // existing logged days win; new days import
  return { ...old, entries: [...entries.values()], water, activities, favorites: keepNew(old.favorites, incoming.favorites),
    recipes: keepNew(old.recipes, incoming.recipes), supplements: keepNew(old.supplements, incoming.supplements) }
}
export function readNutritionBackup(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (data?.kind !== 'openform-nutrition' || data?.data?.schemaVersion !== 1 || !Array.isArray(data?.data?.entries)) {
    throw new Error('Kein unterstütztes openForm-Ernährungsbackup.')
  }
  return normalizedNutrition(data.data)
}
export function nutritionBackup(data) {
  return JSON.stringify({ kind: 'openform-nutrition', exportedAt: new Date().toISOString(), data: normalizedNutrition(data) }, null, 2)
}

// Returns null when OFF doesn't actually provide all essential nutrition numbers;
// no blank fields are disguised as zero. Data is community maintained.
export function parseOpenFoodFacts(payload, barcode) {
  const p = payload?.product
  if (!p || payload.status === 'failure') throw new Error('Produkt nicht gefunden.')
  const q = p.nutriments || {}
  const has = key => q[key] != null && Number.isFinite(Number(q[key]))
  if (!['proteins_100g', 'carbohydrates_100g', 'fat_100g'].every(has) || !(has('energy-kcal_100g') || has('energy-kj_100g'))) {
    throw new Error('Für dieses Produkt fehlen verlässliche Makroangaben. Bitte manuell eingeben.')
  }
  return {
    name: p.product_name || p.product_name_de || p.generic_name || `Produkt ${barcode}`,
    barcode,
    basis: 'g',
    per100: {
      kcal: has('energy-kcal_100g') ? n(q['energy-kcal_100g']) : Math.round(n(q['energy-kj_100g']) / 4.184),
      protein: n(q.proteins_100g), carbs: n(q.carbohydrates_100g), fat: n(q.fat_100g)
    },
    per100Micros: Object.fromEntries(MICRO_NUTRIENTS.flatMap(({key,off,factor}) => has(off) && Number(q[off]) >= 0 ? [[key, Math.round(Number(q[off]) * factor * 100) / 100]] : [])),
    source: 'openfoodfacts'
  }
}
export async function fetchFoodByBarcode(rawCode, fetcher = globalThis.fetch) {
  const code = String(rawCode || '').replace(/\s/g, '')
  if (!/^\d{8,14}$/.test(code)) throw new Error('Bitte einen gültigen Lebensmittel-Barcode eingeben (8–14 Ziffern).')
  // Current OFF v3 read endpoint. Avoid fetching while the user types (rate limit).
  const response = await fetcher(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}?fields=code,product_name,product_name_de,generic_name,nutriments`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 404 ? 'Produkt nicht gefunden.' : 'Open Food Facts ist gerade nicht erreichbar.')
  return parseOpenFoodFacts(await response.json(), code)
}


// Free text search is user initiated, never triggered by each keystroke.
export async function searchFoodByName(raw, fetcher = globalThis.fetch) {
  const term = String(raw || '').trim()
  if (term.length < 2) throw new Error('Bitte mindestens zwei Zeichen eingeben.')
  const url = `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(term)}&page_size=20&fields=code,product_name,product_name_de,generic_name,nutriments`
  const response = await fetcher(url, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('Lebensmittelsuche gerade nicht erreichbar.')
  const payload = await response.json()
  return (payload.products || []).flatMap(p => {
    try { return [parseOpenFoodFacts({ product: p, status: 'success' }, p.code || '')] } catch { return [] }
  })
}
