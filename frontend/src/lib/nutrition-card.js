// A read-only daily nutrition share card. Nothing is persisted or uploaded.
// The complete JSON backup remains the lossless export for restore/import.
import { normalizedNutrition, dateLocal, entryTotals, dayTotals } from './nutrition.js'

const MEALS = [
  ['breakfast', 'Frühstück'], ['lunch', 'Mittagessen'], ['dinner', 'Abendessen'],
  ['snack', 'Snacks'], ['other', 'Weitere Einträge']
]
const safeNumber = n => Math.round((Number(n) || 0) * 10) / 10
const displayDate = value => {
  const [y, m, d] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('de-AT', { day:'2-digit', month:'long', year:'numeric' }).format(new Date(y, m - 1, d))
}
const amountText = e => `${safeNumber(e.quantity)} ${e.unit === 'piece' ? 'Stk.' : e.unit}`

export function nutritionDayCardModel(data, date = dateLocal()) {
  const safe = normalizedNutrition(data)
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dateLocal()
  const entries = safe.entries.filter(e => e.date === day)
  const totals = dayTotals(entries, day)
  const kcalGoal = safeNumber(safe.goals.kcal)
  const proteinGoal = safeNumber(safe.goals.protein)
  const fatGoal = safe.goals.fat ?? Math.round(kcalGoal * .28 / 9)
  const carbsGoal = safe.goals.carbs ?? Math.max(0, Math.round((kcalGoal - proteinGoal * 4 - fatGoal * 9) / 4))
  return {
    date: day, dateLabel: displayDate(day),
    totals,
    goals: { kcal:kcalGoal, protein:proteinGoal, carbs:carbsGoal, fat:fatGoal },
    waterMl: safeNumber(safe.water[day] || 0),
    waterGoalMl: safeNumber(safe.profile.waterGoal),
    groups: MEALS.map(([id, title]) => {
      const foods = entries.filter(e => e.mealType === id).sort((a,b)=>(a.createdAt || 0) - (b.createdAt || 0))
      return { id, title,
        kcal: safeNumber(foods.reduce((sum,e)=>sum+entryTotals(e).kcal,0)),
        items: foods.map(e => ({
          id:e.id, name:e.name, amount:amountText(e), totals:entryTotals(e)
        }))
      }
    }).filter(g => g.items.length),
    entryCount: entries.length,
    activityKcal: safeNumber(safe.activities.filter(a => a.date === day).reduce((sum,a)=>sum+a.kcal,0)),
    supplementCount: safe.supplements.filter(s=>s.logs.includes(day)).length,
    supplementTotal: safe.supplements.length,
  }
}

const fmt = n => new Intl.NumberFormat('de-AT',{ maximumFractionDigits:1 }).format(safeNumber(n))
function palette() {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return {}
  const root = getComputedStyle(document.documentElement)
  return Object.fromEntries(['--bg','--surface','--label','--label-2','--acc'].map(k=>[k,root.getPropertyValue(k).trim()]))
}
function wrap(ctx, value, width, font) {
  ctx.font=font
  const lines=[]
  let line=''
  for(const word of String(value).split(/\s+/).filter(Boolean)) {
    const next=line ? line+' '+word : word
    if (line && ctx.measureText(next).width > width) { lines.push(line); line=word }
    else line=next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}
function circle(ctx, x, y, radius, color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill()
}

export async function nutritionDayCardImage(model, { colors: overrides = {} } = {}) {
  if (typeof document === 'undefined') throw new Error('Der Bildexport benötigt einen Browser.')
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Der Bildexport wird auf diesem Gerät nicht unterstützt.')
  const P=palette()
  const color={
    bg:overrides.bg || P['--bg'] || '#101115',
    surface:overrides.surface || P['--surface'] || '#24252b',
    label:overrides.label || P['--label'] || '#fff',
    dim:overrides.dim || P['--label-2'] || '#a6a7b3',
    accent:overrides.accent || P['--acc'] || '#38c982'
  }
  const font='600 28px system-ui, sans-serif'
  const titleFont='700 40px system-ui, sans-serif'
  const groups=model.groups.map(g=>({...g, items:g.items.map(item=>({
    ...item, lines:wrap(ctx,item.name,585,font)
  }))}))
  const sectionsHeight=groups.reduce((height,g)=>height+110+g.items.reduce((sum,item)=>sum+Math.max(77,item.lines.length*39+31),0),0)
  const height=Math.max(870,650+sectionsHeight+160)
  canvas.width=1080;canvas.height=height
  const text=(v,x,y,size=28,weight=500,colorValue=color.label)=>{
    ctx.fillStyle=colorValue;ctx.font=`${weight} ${size}px system-ui, sans-serif`
    ctx.textBaseline='alphabetic';ctx.fillText(String(v),x,y)
  }
  const rectangle=(x,y,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
  rectangle(0,0,1080,height,color.bg)
  rectangle(72,58,10,92,color.accent)
  text('openForm',110,96,27,700,color.accent)
  text('Ernährung · Tagesbericht',110,145,48,750)
  text(model.dateLabel,74,204,30,500,color.dim)
  rectangle(70,247,940,302,color.surface)
  text(`${fmt(model.totals.kcal)} kcal`,108,330,56,750)
  text(`Tagesziel ${fmt(model.goals.kcal)} kcal`,108,379,27,500,color.dim)
  const macros=[
    ['Protein',model.totals.protein,model.goals.protein],
    ['Kohlenhydrate',model.totals.carbs,model.goals.carbs],
    ['Fett',model.totals.fat,model.goals.fat],
  ]
  macros.forEach(([label,actual,goal],i)=>{
    const x=108+i*298
    text(label,x,454,25,600,color.dim)
    text(`${fmt(actual)} / ${fmt(goal)} g`,x,505,30,700)
  })
  let y=603
  if(!groups.length) {
    text('Keine Mahlzeiten für diesen Tag eingetragen.',85,y+30,28,500,color.dim)
    y+=105
  }
  for(const group of groups) {
    rectangle(70,y-38,940,3,color.surface)
    text(group.title,86,y+17,37,750)
    ctx.font='600 27px system-ui, sans-serif'
    const numberText=`${fmt(group.kcal)} kcal`
    text(numberText,985-ctx.measureText(numberText).width,y+17,27,600,color.accent)
    y+=77
    for(const item of group.items) {
      const rowHeight=Math.max(77,item.lines.length*39+31)
      for(const line of item.lines) {text(line,90,y+4,28,600);y+=39}
      text(`${item.amount}   ·   ${fmt(item.totals.kcal)} kcal   ·   ${fmt(item.totals.protein)} g Protein`,90,y+3,23,500,color.dim)
      y+=rowHeight-item.lines.length*39
    }
    y+=37
  }
  const bottomY=Math.max(height-177,y+8)
  rectangle(70,bottomY-21,940,3,color.surface)
  circle(ctx,90,bottomY+41,7,color.accent)
  text(`Wasser: ${fmt(model.waterMl)} / ${fmt(model.waterGoalMl)} ml`,115,bottomY+50,26,550)
  text(`${model.entryCount} Einträge · ${model.supplementCount}/${model.supplementTotal} Supplements genommen`,85,bottomY+103,24,500,color.dim)
  text('Nährwerte laut Tagebuch · kein vollständiges Datenbackup',76,height-36,22,500,color.dim)
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob ? resolve(blob) : reject(new Error('Das Tagesbild konnte nicht gespeichert werden.')),'image/png')
  })
}
