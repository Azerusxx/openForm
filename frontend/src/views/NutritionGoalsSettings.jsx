import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadNutrition, saveNutrition } from '../lib/nutrition.js'
import { useStore } from '../store/useStore.js'
import { bwSheet, goalSheet } from '../sheets.jsx'
import './Nutrition.css'

export default function NutritionGoalsSettings() {
  const nav = useNavigate()
  const [data, setData] = useState(loadNutrition)
  const gym = useStore(s => s.S)
  const lastWeight = gym.bodyweight?.at(-1)?.w
  const [draft, setDraft] = useState(() => ({ ...loadNutrition().goals }))
  const [waterGoal, setWaterGoal] = useState(() => loadNutrition().profile?.waterGoal || 1900)
  const [activity, setActivity] = useState(() => loadNutrition().profile?.activity || 'moderate')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const changed = () => { const d = loadNutrition(); setData(d); setDraft({ ...d.goals }); setActivity(d.profile?.activity || 'moderate'); setWaterGoal(d.profile?.waterGoal || 1900) }
    window.addEventListener('openform-nutrition-changed', changed)
    return () => window.removeEventListener('openform-nutrition-changed', changed)
  }, [])
  const save = e => {
    e.preventDefault()
    const kcal = Number(draft.kcal), protein = Number(draft.protein)
    const optional = key => draft[key] === '' || draft[key] == null ? null : Number(draft[key])
    if (!(Number(waterGoal) > 0 && Number(waterGoal) <= 10000)) { setNotice('Wasserziel muss zwischen 1 und 10000 ml liegen.'); return }
    if (!(kcal > 0 && protein > 0) || !['carbs','fat'].every(key => optional(key) === null || (Number.isFinite(optional(key)) && optional(key) >= 0))) {
      setNotice('Bitte gültige Zielwerte eingeben.'); return
    }
    try { saveNutrition({ ...data, profile: { ...data.profile, activity, waterGoal: Number(waterGoal) }, goals: { kcal, protein, carbs: optional('carbs'), fat: optional('fat') } }); setNotice('Ernährungsziele gespeichert.') }
    catch { setNotice('Speichern fehlgeschlagen. Bitte vorher ein Backup erstellen.') }
  }
  return <div className="card of-profile">
    <h2>Dein openForm-Profil</h2>
    <p>Gewicht, Gewichtsziel und Ernährungsziele an einer Stelle. Die Waage und das Ziel verwenden dieselben Werte wie Training und Statistik. Kalorien und Makros bleiben manuell einstellbar.</p>
    <div className="of-profile-weight">
      <div><small>Aktuelles Gewicht</small><strong>{lastWeight != null ? `${lastWeight} ${gym.unit || 'kg'}` : 'Nicht erfasst'}</strong>
        <button type="button" onClick={() => bwSheet()}>Gewicht erfassen</button></div>
      <div><small>Zielgewicht</small><strong>{gym.targetW != null ? `${gym.targetW} ${gym.unit || 'kg'}` : 'Kein Ziel'}</strong>
        <button type="button" onClick={goalSheet}>Ziel ändern</button></div>
    </div>
    <div className="of-profile-measures">
      <span>Körpermaße: {(gym.measurements || []).length} Check-ins</span>
      <button type="button" onClick={() => nav('/measurements')}>Körpermaße öffnen</button>
    </div>
    <h3>Ernährungsziele</h3>
    <form className="of-goals" onSubmit={save}>
      <label className="of-activity">Aktivitätsniveau (Selbsteinschätzung)
        <select value={activity} onChange={e => setActivity(e.target.value)}>
          <option value="low">Überwiegend sitzend</option>
          <option value="light">Leicht aktiv</option>
          <option value="moderate">Moderat aktiv</option>
          <option value="high">Sehr aktiv</option>
        </select>
        <small>Ändert dein Kalorienziel nicht automatisch. Training wird separat erfasst.</small>
      </label>
      <label className="of-activity">Wasserziel pro Tag (ml)<input type="number" min="1" max="10000" step="50" value={waterGoal} onChange={e => setWaterGoal(e.target.value)} /></label>
      {[['kcal','Kalorien pro Tag (kcal)'],['protein','Protein pro Tag (g)'],['carbs','Kohlenhydrate (g, optional)'],['fat','Fett (g, optional)']].map(([key,label]) =>
        <label key={key}>{label}<input type="number" inputMode="decimal" min={key === 'kcal' || key === 'protein' ? '1' : '0'} step="any" value={draft[key] ?? ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}/></label>)}
      <button className="of-save-goals" type="submit">Ziele speichern</button>
    </form>
    {notice && <p role="status" className="of-notice">{notice}</p>}
    <p>Kalorien und Protein werden im Essen-Tab besonders hervorgehoben.</p>
  </div>
}
