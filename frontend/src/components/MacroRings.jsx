import React from 'react'
import './MacroRings.css'

// Single accent, four related tones. The SVG contains both macro progress and
// the calorie-budget progress; actual values remain visible in an accessible legend.
// Never infer a missing goal and never represent missing data as achieved.
const SPEC = [
  {key:'carbs',label:'Kohlenhydrate',r:93,stroke:12,css:'--macro-carbs'},
  {key:'fat',label:'Fett',r:76,stroke:12,css:'--macro-fat'},
  {key:'protein',label:'Protein',r:59,stroke:12,css:'--macro-protein'},
  {key:'kcal',label:'Kalorien',r:42,stroke:10,css:'--macro-kcal'},
]
export const ringPercent = (value,goal) => {
  const v=Number(value),g=Number(goal)
  return Number.isFinite(v) && Number.isFinite(g) && g>0 ? Math.min(100,Math.max(0,v/g*100)) : 0
}
const number = n => Math.round((Number(n)||0)*10)/10
export default function MacroRings({totals={},goals={},remaining=0}) {
  const rings=SPEC.map(spec=>{
    const value=Number(totals[spec.key])||0, goal=goals[spec.key]
    return {...spec,value,goal,pct:ringPercent(value,goal),excess:Number(goal)>0 && value>Number(goal)}
  })
  const calorie=rings[3]
  return <div className="of-macro-ring-block">
    <div className="of-macro-rings" aria-label="Kalorien, Kohlenhydrate, Fett und Protein als Fortschrittsringe">
      <svg viewBox="0 0 220 220" role="img" aria-label={rings.map(r=>r.label+': '+number(r.value)+' von '+(r.goal==null?'unbekannt':number(r.goal))+(r.key==='kcal'?' kcal':' g')).join(', ')}>
        {rings.map(r=>{
          const length=2*Math.PI*r.r
          return <g key={r.key} transform="rotate(-90 110 110)">
            <circle cx="110" cy="110" r={r.r} fill="none" stroke="var(--macro-track)" strokeWidth={r.stroke}/>
            <circle cx="110" cy="110" r={r.r} fill="none" stroke={r.excess?'var(--macro-excess)':`var(${r.css})`}
              strokeWidth={r.stroke} strokeLinecap="round"
              strokeDasharray={length} strokeDashoffset={length*(1-r.pct/100)}/>
          </g>
        })}
      </svg>
      <div className="of-macro-ring-center" aria-label={Math.abs(remaining)+' Kilokalorien '+(remaining>=0?'übrig':'über Ziel')}>
        <strong className={remaining<0?'is-over':''}>{Math.abs(remaining)}</strong>
        <span>kcal {remaining>=0?'übrig':'über Ziel'}</span>
      </div>
    </div>
    <div className="of-macro-ring-legend" aria-label="Makro-Tagesziele">
      {rings.slice(0,3).map(r=><div key={r.key} className="of-macro-legend-row">
        <span className="of-macro-legend-name"><i style={{background:`var(${r.css})`}}/>{r.label}</span>
        <strong className={r.excess?'is-over':''}>{number(r.value)} / {r.goal==null?'–':number(r.goal)} g</strong>
      </div>)}
      <details className="of-macro-ring-details">
        <summary>Fortschritt im Detail</summary>
        {rings.map(r=><div key={r.key}><span>{r.label}</span><span>{number(r.value)} / {r.goal==null?'–':number(r.goal)} {r.key==='kcal'?'kcal':'g'} · {r.goal==null?'kein Ziel':Math.round(r.pct)+' %'}{r.excess?' · über Ziel':''}</span></div>)}
      </details>
    </div>
  </div>
}
