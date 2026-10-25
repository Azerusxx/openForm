import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { weightForecast, circumferenceForecast } from '../lib/body-development.js'
import { todayISO, fmtDate, fmtNum } from '../lib/format.js'
import LineChart from './LineChart.jsx'
import Icon from './Icon.jsx'
import './BodyDevelopment.css'

// Analytics only; the component never writes S.bodyweight, S.measurements or plans.
const informative={
 insufficient:'Noch nicht genug Messwerte für eine verlässliche Prognose. Gewicht: mindestens 4 getrennte Messwochen über 4 Wochen.',
 stale:'Deine letzten Gewichtsdaten sind zu alt für eine aktuelle Prognose. Bitte erneut wiegen.',
 volatile:'Die Werte schwanken zu stark für eine sinnvolle lineare Prognose.',
}
const fmtSign=n=>(n>0?'+':'')+fmtNum(n)
export default function BodyDevelopment({ S }) {
 const nav=useNavigate()
 const today=todayISO()
 const weight=useMemo(()=>weightForecast(S.bodyweight,today,{unit:S.unit,goal:S.targetW}),[S.bodyweight,S.unit,S.targetW,today])
 const waist=useMemo(()=>circumferenceForecast(S.measurements,'waist',today,{unit:S.unit==='lb'?'in':'cm'}),[S.measurements,S.unit,today])
 const abdomen=useMemo(()=>circumferenceForecast(S.measurements,'abdomen',today,{unit:S.unit==='lb'?'in':'cm'}),[S.measurements,S.unit,today])
 const hasPrediction=weight.status==='ready'
 return <section className="card body-development" aria-label="Körperentwicklung und Prognose">
   <div className="row between body-development-title">
     <div><h2><Icon name="trendingUp" /> Körperentwicklung & Prognose</h2>
       <p className="muted small">Gewicht als Wochenmittel, Taille und Bauch aus deinen Körpermessungen.</p></div>
     <button type="button" className="body-development-link" onClick={()=>nav('/measurements')}>Messungen <Icon name="chevronRight" /></button>
   </div>
   {hasPrediction ? <>
     <div className="body-development-cards">
       <div><span>Gewichtstrend</span><strong>{weight.stable?'Stabil':fmtSign(weight.perWeek)+' '+S.unit+'/Woche'}</strong></div>
       <div><span>In 4 Wochen, rechnerisch</span><strong>{fmtNum(weight.projected.y)} {S.unit}</strong></div>
       <div><span>Grobe mögliche Spanne</span><strong>{fmtNum(weight.projected.lower)}–{fmtNum(weight.projected.upper)} {S.unit}</strong></div>
     </div>
     <div className="body-development-plot"><LineChart points={weight.points} h={142} unit={S.unit} color="var(--teal)" /></div>
     {weight.goalDate && <p className="body-development-target">
       <Icon name="target" /> Dein eingetragenes Gewichtsziel wäre bei unverändertem Trend rechnerisch etwa {fmtDate(weight.goalDate,true)} erreichbar. Das ist <strong>kein zugesagtes Zieldatum</strong>.
     </p>}
     {!weight.goalDate&&S.targetW>0&&<p className="muted small">Für das Gewichtsziel lässt sich aus dem aktuellen Verlauf kein belastbarer Termin ableiten.</p>}
   </> : <div className="body-development-unavailable">
     <Icon name="scale" /><p>{informative[weight.status]||informative.insufficient}</p>
   </div>}
   <div className="body-development-metrics">
     {[[waist,'Taille'],[abdomen,'Bauch']].map(([trend,label])=><div key={label}>
       <span>{label}</span>
       <strong>{trend.latest ? fmtNum(trend.latest.y)+' '+trend.unit:'Noch kein Wert'}</strong>
       <small>{trend.status==='ready'?
         (trend.stable?'Etwa unverändert':fmtSign(trend.perWeek)+' '+trend.unit+'/Woche') :
         trend.status==='stale'?'Bitte neu messen':
         'Für einen Trend mindestens 3 Messungen über 4 Wochen'}</small>
     </div>)}
   </div>
   <p className="body-development-disclaimer">Rechnerische Trendfortschreibung, keine Messung von Fettverlust oder Muskelaufbau. Schlaf, Wasser, Krankheit und Training können den Verlauf verändern. Kein Rückschluss auf einen Sixpack-Termin.</p>
 </section>
}
