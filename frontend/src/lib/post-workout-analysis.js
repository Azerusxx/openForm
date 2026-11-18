// Immediate, on-device debrief based only on completed training logs.
// This is not a generative model response. It never overwrites workouts or routines.
import { finishCompare } from './finish-compare.js'
import { isWarmupRow } from './workout-model.js'
import { rirOf } from './effort.js'
import { workoutVolume } from './history.js'
import { rotationIds } from './rotation.js'
import { buildPlannedEntry } from './session-start.js'
import { EXIDX } from './exercises.js'
import { exerciseNameFor } from './i18n-core.js'

const round = x => Math.round(x * 10) / 10
const valid = x => typeof x === 'number' && Number.isFinite(x)
const workSets = e => (e?.sets || []).filter(s => s?.done && !isWarmupRow(s))
const nameFor = (state, id) => (state.customEx || []).find(e => e.id === id)?.n || (EXIDX[id] ? exerciseNameFor(EXIDX[id]) : id)

/** The next planned A/B/C slot (or other explicit rotation) only when its sequence is known. */
export function nextRotationRoutine(state, workout) {
  const completed = (workout?.routineIds || (workout?.routineId ? [workout.routineId] : []))
  const routines = state.routines || []
  let ids = rotationIds(state)
  // Some users run separately saved "Plan A", "Plan B", "Plan C" without
  // enabling the optional rotation mode. Only infer order when all three
  // labels are unambiguous; otherwise do not pretend to know what's next.
  if (ids.length < 2) {
    const byLetter = ['A','B','C'].map(letter => routines.filter(r => {
      const match = String(r.name || '').trim().match(/^(?:plan|ganzk[oö]rper|training)\s*([ABC])$/i)
      return match && match[1].toUpperCase() === letter
    }))
    if (byLetter.every(rows => rows.length === 1)) ids = byLetter.map(rows => rows[0].id)
  }
  if (ids.length < 2) return null
  const at = ids.findIndex(id => completed.includes(id))
  if (at < 0) return null
  return routines.find(r => r.id === ids[(at + 1) % ids.length]) || null
}

/** Never infer perceived effort from reps or weight alone. */
export function postWorkoutAnalysis(state, workout) {
  if (!workout) return null
  const previous = (state.workouts || []).filter(w => w && w.id !== workout.id && (Number(w.start) || 0) < (Number(workout.start) || Infinity)).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0))
  const compare = new Map(finishCompare(state, workout).map(x => [x.id, x]))
  const exercises = (workout.entries || []).map(entry => {
    const done = workSets(entry)
    if (!done.length) return null
    const rated = done.map(rirOf).filter(valid)
    const avgRir = rated.length ? round(rated.reduce((a,b)=>a+b,0) / rated.length) : null
    const top = done.filter(s => valid(Number(s.w)) && Number(s.w) > 0).reduce((m,s)=>Math.max(m, Number(s.w)),0)
    const last = [...previous].reverse().flatMap(w=>(w.entries||[]).filter(e=>e.id===entry.id)).find(e=>workSets(e).length)
    const old = last ? workSets(last) : []
    const earlierTop = old.reduce((m,s)=>Math.max(m, Number(s.w)||0),0)
    const currentReps = done.reduce((n,s)=>n+(Number(s.r)||0),0)
    const earlierReps = old.reduce((n,s)=>n+(Number(s.r)||0),0)
    const trend = compare.get(entry.id)?.trend ?? null
    const next = compare.get(entry.id)?.next ?? null
    const warning = rated.length && avgRir <= 0.5
      ? 'Sehr nah am Muskelversagen; Technik und Erholung prüfen.'
      : rated.length && avgRir >= 4
        ? 'Hohe gemeldete Reserve; Belastung beim nächsten Mal prüfen.'
        : null
    return {
      id:entry.id, name:nameFor(state,entry.id), sets:done.length,
      lines:done.map(s=>({w:Number(s.w)||0,r:Number(s.r)||0,rir:valid(rirOf(s))?rirOf(s):null})),
      rated:rated.length, avgRir, top, previousTop:old.length?earlierTop:null,
      repDelta:old.length && top===earlierTop ? currentReps-earlierReps : null,
      trend, next, warning
    }
  }).filter(Boolean)
  const rated = exercises.flatMap(e => e.lines.map(s=>s.rir).filter(valid))
  const total = exercises.reduce((n,e)=>n+e.sets,0)
  const nextRoutine = nextRotationRoutine(state,workout)
  const nextExercises = nextRoutine ? (nextRoutine.ex || []).map(cfg=>{
    const prev = [...(state.workouts||[])].reverse().flatMap(w=>w.entries||[]).find(en=>en.id===cfg.id && workSets(en).length)
    const work = prev ? workSets(prev) : []
    const lastSet=work[0]||null
    // This is the SAME progression builder the training-start flow uses; preview only.
    let planned = null
    try { planned = buildPlannedEntry(state,cfg,nextRoutine) } catch { /* unreadable config: don't invent values */ }
    const target=planned?.target || {}
    return {id:cfg.id,name:nameFor(state,cfg.id), last: lastSet ? {w:Number(lastSet.w)||0,r:Number(lastSet.r)||0}:null,
      target: {w:valid(Number(target.weight)) && Number(target.weight)>0 ? Number(target.weight):null,
        reps: Number.isFinite(Number(target.reps)) && Number(target.reps)>0 ? Number(target.reps):null,
        sets:Number(target.sets)||null},
      note:planned ? (planned.plan?.kind || 'plan') : 'Ohne sichere Progressionsdaten'}
  }) : []
  return {
    name:workout.name||'Training', date:workout.d, exercises,
    sets:total, rated:rated.length, avgRir:rated.length?round(rated.reduce((a,b)=>a+b,0)/rated.length):null,
    duration:valid(workout.end) && valid(workout.start) && workout.end>workout.start ? Math.round((workout.end-workout.start)/60000):null,
    volume:valid(workout.vol) ? workout.vol : workoutVolume(workout),
    positives:exercises.filter(e=>e.trend>0).length, regressions:exercises.filter(e=>e.trend<0).length,
    nextRoutine:nextRoutine?.name||null,nextExercises
  }
}
/** Human-readable, data-backed note for the Coach history; no remote model required. */
export function postWorkoutAnalysisText(state, workout) {
  const r=postWorkoutAnalysis(state,workout)
  if(!r)return ''
  const unit=state.unit==='lb'?'lb':'kg'
  const number=x=>String(round(x)).replace('.',',')
  const details=r.exercises.map(ex=>{
    const sets=ex.lines.map(s=>(s.w>0?number(s.w)+unit+'×':'')+number(s.r)+(s.rir!=null?' (RIR '+number(s.rir)+')':'')).join(', ')
    const comparison=ex.previousTop!=null
      ? 'Vorheriger Höchstwert '+number(ex.previousTop)+unit+'.'
      : 'Noch keine vergleichbare Einheit.'
    const progression=ex.next ? ' Nächstes Mal: '+(ex.next.w!=null?number(ex.next.w)+unit:'')+(ex.next.r!=null?' × '+number(ex.next.r):'')+' ('+ex.next.kind+').' : ''
    return ex.name+': '+sets+'. '+comparison+(ex.warning?' '+ex.warning:'')+progression
  })
  const next=r.nextRoutine
    ? ['Nächste Einheit: '+r.nextRoutine,...r.nextExercises.map(e=>e.name+': '+(e.target.w!=null?number(e.target.w)+unit:'Gewicht offen')+(e.target.reps!=null?' × '+e.target.reps:'')+(e.target.sets!=null?' ('+e.target.sets+' Sätze)':''))]
    : ['Nächste Einheit nicht sicher aus dem gespeicherten Plan ableitbar.']
  return ['🤙💪 Trainingsanalyse · '+r.name,
    'Dauer '+(r.duration!=null?r.duration+' Min.':'unbekannt')+' · '+r.sets+' Arbeitssätze · Volumen '+number(r.volume)+' '+unit,
    'RIR '+(r.avgRir!=null?'Ø '+number(r.avgRir)+' aus '+r.rated+' bewerteten Sätzen':'nicht vollständig erfasst'),
    ...details,
    ...next,
    'Die Werte sind aus deinen gespeicherten Daten berechnet. Technik, Schmerzen und Erholung kann die App nicht allein daraus beurteilen.'
  ].join('\n\n')
}
