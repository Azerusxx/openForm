import { useEffect, useState } from 'react'
import { loadNutrition, saveNutrition } from '../lib/nutrition.js'
import './Nutrition.css'

export default function NutritionGoalsSettings() {
  const [data, setData] = useState(loadNutrition)
  const [draft, setDraft] = useState(() => ({ ...loadNutrition().goals }))
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const changed = () => { const d = loadNutrition(); setData(d); setDraft({ ...d.goals }) }
    window.addEventListener('openform-nutrition-changed', changed)
    return () => window.removeEventListener('openform-nutrition-changed', changed)
  }, [])
  const save = e => {
    e.preventDefault()
    const kcal = Number(draft.kcal), protein = Number(draft.protein)
    const optional = key => draft[key] === '' || draft[key] == null ? null : Number(draft[key])
    if (!(kcal > 0 && protein > 0) || !['carbs','fat'].every(key => optional(key) === null || (Number.isFinite(optional(key)) && optional(key) >= 0))) {
      setNotice('Bitte gültige Zielwerte eingeben.'); return
    }
    try { saveNutrition({ ...data, goals: { kcal, protein, carbs: optional('carbs'), fat: optional('fat') } }); setNotice('Ernährungsziele gespeichert.') }
    catch { setNotice('Speichern fehlgeschlagen. Bitte vorher ein Backup erstellen.') }
  }
  return <div className="card of-profile">
    <h2>Ernährungsprofil</h2>
    <p>Hier legst du deine Ernährungsziele fest. Dein Körpergewicht, Maße und Trainingsprofil bleiben zentral in openForm. Ziele sind zunächst manuell gesetzt, nicht medizinisch berechnet.</p>
    <form className="of-goals" onSubmit={save}>
      {[['kcal','Kalorien pro Tag (kcal)'],['protein','Protein pro Tag (g)'],['carbs','Kohlenhydrate (g, optional)'],['fat','Fett (g, optional)']].map(([key,label]) =>
        <label key={key}>{label}<input type="number" inputMode="decimal" min={key === 'kcal' || key === 'protein' ? '1' : '0'} step="any" value={draft[key] ?? ''} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}/></label>)}
      <button className="of-save-goals" type="submit">Ziele speichern</button>
    </form>
    {notice && <p role="status" className="of-notice">{notice}</p>}
    <p>Kalorien und Protein werden im Essen-Tab besonders hervorgehoben.</p>
  </div>
}
