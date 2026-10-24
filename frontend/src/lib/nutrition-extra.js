// Additive nutrition helpers for openForm 0.2. Never touch gym_state_v1.
import { createEntry, dayTotals, entryTotals, dateLocal } from './nutrition.js'

const round = value => Math.round(value * 10) / 10
const validNum = value => Number.isFinite(Number(value)) && Number(value) > 0
const uid = () => globalThis.crypto?.randomUUID?.() ?? `of-${Date.now()}-${Math.random().toString(36).slice(2)}`
const isTemplate = item => item && typeof item.name === 'string' && item.name.trim() && validNum(item.quantity) &&
  ['g', 'ml', 'piece'].includes(item.unit) && ['g', 'ml'].includes(item.basis) &&
  (item.unit === 'piece' ? validNum(item.pieceSize) : item.unit === item.basis) && item.per100 &&
  ['kcal', 'protein', 'carbs', 'fat'].every(k => Number.isFinite(Number(item.per100[k])) && Number(item.per100[k]) >= 0)
export const foodTemplate = item => ({ name: String(item.name).trim().slice(0, 160), quantity: Number(item.quantity), unit: item.unit,
  basis: item.basis, pieceSize: item.unit === 'piece' ? Number(item.pieceSize) : null,
  per100: { kcal: Number(item.per100.kcal), protein: Number(item.per100.protein), carbs: Number(item.per100.carbs), fat: Number(item.per100.fat) },
  barcode: item.barcode || null, source: item.source || 'manual' })
export function cleanFavorites(value) {
  return Array.isArray(value) ? value.filter(x => x && typeof x.id === 'string' && isTemplate(x.food))
    .map(x => ({ id: x.id, food: foodTemplate(x.food) })).slice(0, 100) : []
}
export function addFavorite(data, entry) {
  if (!isTemplate(entry)) throw new Error('Ungültiges Lebensmittel.')
  const favorites = cleanFavorites(data.favorites)
  const key = `${entry.name.trim().toLocaleLowerCase('de')}:${entry.unit}:${entry.barcode || ''}`
  const exists = favorites.find(x => `${x.food.name.toLocaleLowerCase('de')}:${x.food.unit}:${x.food.barcode || ''}` === key)
  return { ...data, favorites: exists ? favorites.filter(x => x.id !== exists.id) : [{ id: uid(), food: foodTemplate(entry) }, ...favorites] }
}
export const isFavorite = (data, entry) => cleanFavorites(data.favorites).some(x => x.food.name.toLocaleLowerCase('de') === entry.name.toLocaleLowerCase('de') && x.food.unit === entry.unit)
export function repeatMeal(food, date = dateLocal(), quantity = null) {
  if (!isTemplate(food)) throw new Error('Ungültiges Lebensmittel.')
  return createEntry({ ...foodTemplate(food), quantity: quantity == null ? Number(food.quantity) : quantity, date })
}
export function cleanRecipes(value) {
  return Array.isArray(value) ? value.filter(r => r && typeof r.id === 'string' && typeof r.name === 'string' && r.name.trim() && validNum(r.servings) && Array.isArray(r.items))
    .map(r => ({ id: r.id, name: r.name.slice(0, 120), servings: Number(r.servings), items: r.items.filter(isTemplate).map(foodTemplate) }))
    .filter(r => r.items.length).slice(0, 150) : []
}
export function createRecipe(name, entries, servings = 1) {
  if (!String(name || '').trim() || !validNum(servings) || !Array.isArray(entries) || !entries.length || entries.some(x => !isTemplate(x))) throw new Error('Rezeptname, Zutaten und Portionen prüfen.')
  return { id: uid(), name: name.trim().slice(0, 120), servings: Number(servings), items: entries.map(foodTemplate) }
}
export function recipeTotals(recipe) {
  if (!recipe || !validNum(recipe.servings)) return { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  const total = (recipe.items || []).reduce((sum, item) => {
    const each = entryTotals(item)
    for (const k of Object.keys(sum)) sum[k] += each[k]
    return sum
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 })
  return Object.fromEntries(Object.entries(total).map(([k,v]) => [k, round(v / recipe.servings)]))
}
export function logRecipe(recipe, portions, date = dateLocal()) {
  if (!recipe || !validNum(recipe.servings) || !validNum(portions) || !(recipe.items || []).length) throw new Error('Ungültige Rezeptportion.')
  const factor = Number(portions) / Number(recipe.servings)
  return recipe.items.map(item => ({ ...repeatMeal(item, date, Math.round(Number(item.quantity) * factor * 10000) / 10000), recipeId: recipe.id, recipeName: recipe.name }))
}
export function cleanSupplements(value) {
  return Array.isArray(value) ? value.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string' && s.name.trim() && validNum(s.dose) && ['g','mg','ml','piece'].includes(s.unit))
    .map(s => ({ id: s.id, name: s.name.slice(0, 100), dose: Number(s.dose), unit: s.unit,
      logs: Array.isArray(s.logs) ? [...new Set(s.logs.filter(x => /^\d{4}-\d\d-\d\d$/.test(x)))].slice(-800) : [] })).slice(0, 100) : []
}
export function weeklyNutrition(entries, anchor = dateLocal(), goals = { kcal: 2200, protein: 150 }) {
  const [y,m,d] = anchor.split('-').map(Number)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = dateLocal(new Date(y, m-1, d-6+i))
    const consumed = (entries || []).some(e => e.date === date)
    return { date, consumed, ...dayTotals(entries, date) }
  })
  const logged = days.filter(d => d.consumed)
  const sum = key => round(logged.reduce((s, d) => s + d[key], 0) / (logged.length || 1))
  return { days, daysLogged: logged.length, average: { kcal: sum('kcal'), protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat') },
    goalsReached: logged.filter(d => d.protein >= goals.protein).length }
}
