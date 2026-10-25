// 0.4.1: retrospective nutrition analysis. Missing diary days remain missing.
// A goal hit represents logged intake, not proof of complete logging.
import { weeklyNutrition } from './nutrition-extra.js'
import { entryTotals } from './nutrition.js'
const round = n => Math.round(n * 10) / 10
const TYPES = ['kcal','protein','carbs','fat']
export function nutritionWeekAnalysis(entries, anchor, goals, bodyweight = [], unit = 'kg') {
  const base = weeklyNutrition(entries,anchor,goals)
  const days = base.days.map(day => ({
    ...day,
    goals: Object.fromEntries(TYPES.map(k => {
      const g = Number(goals?.[k])
      if (!day.consumed || !Number.isFinite(g) || g <= 0) return [k,null]
      // Calories and fat use ceilings; protein is a minimum; carbs are descriptive.
      if (k === 'carbs') return [k,{target:g,ratio:round(day[k]/g),met:null}]
      return [k,{target:g,ratio:round(day[k]/g),met:k === 'protein' ? day[k] >= g : day[k] <= g}]
    }))
  }))
  const logged = days.filter(d=>d.consumed)
  const goalStats = Object.fromEntries(TYPES.map(k=> {
    const evaluated = logged.map(d=>d.goals[k]).filter(v=>v && v.met !== null)
    return [k,{met:evaluated.filter(v=>v.met).length,evaluated:evaluated.length}]
  }))
  const first = days[0]?.date, last=days.at(-1)?.date
  const measurements = (Array.isArray(bodyweight) ? bodyweight : [])
    .filter(p=>p && typeof p.d === 'string' && p.d >= first && p.d <= last &&
      Number.isFinite(Number(p.w)) && Number(p.w) > 0)
    .map(p=>({date:p.d,weight:round(Number(p.w) * (unit === 'lb' ? 0.45359237 : 1))}))
    .sort((a,b)=>a.date.localeCompare(b.date))
  const weightsByDay = new Map()
  measurements.forEach(p=>weightsByDay.set(p.date,p))
  const weights=[...weightsByDay.values()]
  return { ...base, days, goalStats, weights,
    weightDelta:weights.length>=2 ? round(weights.at(-1).weight - weights[0].weight) : null,
    weightInsufficient:weights.length<2,
    loggedCoverage:round(logged.length/7*100) }
}
export function frequentMeals(entries, limit = 6) {
  const groups = new Map()
  for(const entry of entries || []) {
    if (!entry || typeof entry.name !== 'string' || !(Number(entry.quantity)>0)) continue
    const key = entry.name.trim().toLocaleLowerCase('de') + '|' + entry.unit
    const prev = groups.get(key)
    const time = (entry.date || '') + ':' + String(entry.createdAt || 0).padStart(15,'0')
    if (!prev) groups.set(key,{ name:entry.name,count:1,latest:entry,time,energy:entryTotals(entry).kcal })
    else { prev.count++; if(time>prev.time) {prev.latest=entry;prev.time=time;prev.energy=entryTotals(entry).kcal} }
  }
  return [...groups.values()].sort((a,b)=>b.count-a.count || b.time.localeCompare(a.time)).slice(0,limit)
}
