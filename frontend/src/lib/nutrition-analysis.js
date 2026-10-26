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
  const weightTrend = analyzeWeightTrend(bodyweight,anchor,30,unit)
  const mealContributions = highestContributors(entries,anchor)
  const averageDeviation = Object.fromEntries(TYPES.map(k=>[k,
    logged.length && Number.isFinite(Number(goals?.[k])) && Number(goals[k])>0
      ? round(base.average[k]-Number(goals[k])) : null]))
  return { ...base, days, goalStats, weights:weightTrend.weights, weightTrend, mealContributions,
    averageDeviation, quality:logged.length === 0 ? 'none' : logged.length < 3 ? 'insufficient'
      : logged.length < 5 ? 'preliminary' : 'useful',
    weightDelta:weightTrend.weightDelta,
    weightInsufficient:weightTrend.weeklyMeans.length < 2,
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

const isoDay = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')) ? value : null
const minusDays = (date,amount) => {
  const [y,m,d]=date.split('-').map(Number)
  const x=new Date(Date.UTC(y,m-1,d-amount))
  return x.toISOString().slice(0,10)
}
export function analyzeWeightTrend(bodyweight, anchor, windowDays = 30, unit = 'kg') {
  const end=isoDay(anchor) || new Date().toISOString().slice(0,10)
  const lower=windowDays === 'all' ? null : minusDays(end, Math.max(1,Number(windowDays)||30)-1)
  const measurements=(Array.isArray(bodyweight)?bodyweight:[])
    .filter(x=>isoDay(x?.d) && x.d <= end && (!lower || x.d>=lower) &&
      Number.isFinite(Number(x.w)) && Number(x.w)>0)
    .map(x=>({date:x.d,weight:round(Number(x.w)*(unit==='lb'?0.45359237:1))}))
    .sort((a,b)=>a.date.localeCompare(b.date))
  const daily=new Map(); measurements.forEach(x=>daily.set(x.date,x))
  const weights=[...daily.values()]
  // ISO Monday-to-Sunday weeks; 1 observation is shown but cannot establish
  // a statistically meaningful week-to-week direction on its own.
  const weeks=new Map()
  for(const x of weights){
    const dt=new Date(x.date+'T12:00:00Z')
    const offset=(dt.getUTCDay()+6)%7
    dt.setUTCDate(dt.getUTCDate()-offset)
    const key=dt.toISOString().slice(0,10)
    const group=weeks.get(key)||[]
    group.push(x.weight);weeks.set(key,group)
  }
  const weeklyMeans=[...weeks].sort((a,b)=>a[0].localeCompare(b[0]))
    .map(([date,values])=>({date,mean:round(values.reduce((s,n)=>s+n,0)/values.length),measurements:values.length}))
  const weightDelta=weeklyMeans.length>=2 ? round(weeklyMeans.at(-1).mean-weeklyMeans[0].mean):null
  return { weights, weeklyMeans, weightDelta, windowDays, first:weights[0]?.date||null,
    last:weights.at(-1)?.date||null, insufficient:weeklyMeans.length<2,
    limited:weeklyMeans.some(x=>x.measurements<2)}
}
export function highestContributors(entries,anchor,limit=5) {
  const days=new Set(Array.from({length:7},(_,i)=>minusDays(anchor,6-i)))
  const matching=(entries||[]).filter(e=>days.has(e.date))
  const byName=new Map()
  for(const e of matching){
    const name=String(e.name||'Unbenannt').trim()
    const t=entryTotals(e)
    const x=byName.get(name)||{name,kcal:0,protein:0,carbs:0,fat:0,count:0}
    for(const key of TYPES)x[key]+=t[key]
    x.count++;byName.set(name,x)
  }
  return [...byName.values()].map(x=>({...x,...Object.fromEntries(TYPES.map(k=>[k,round(x[k])]))}))
    .sort((a,b)=>b.kcal-a.kcal).slice(0,limit)
}
export function similarMealSuggestions(entries, limit=8) {
  // Only suggest, never merge distinct dishes: first two nontrivial normalized
  // tokens are a conservative resemblance hint, not proof of equal ingredients.
  const normalized=x=>String(x||'').toLocaleLowerCase('de')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\p{L}\p{N}]+/gu,' ').trim()
  const candidates=frequentMeals(entries,Math.max(30,limit*4))
  return candidates.map(item=>{
    const a=normalized(item.name).split(' ').filter(w=>w.length>=4)
    const related=candidates.filter(other=>{
      if(other===item)return false
      const b=normalized(other.name).split(' ')
      return a.some(token=>b.includes(token))
    }).map(x=>x.name).slice(0,3)
    return {...item,related}
  }).slice(0,limit)
}
