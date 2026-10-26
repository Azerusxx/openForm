import { hybridFoodSearch, estimateFood } from '../lib/nutrition-hybrid.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon.jsx'
import { useStore } from '../store/useStore.js'
import { bwSheet } from '../sheets.jsx'
import { MOBILE } from '../lib/mobile.js'
import { scanCode, importCodeFromImage } from '../lib/scan.js'
import { dateLocal, loadNutrition, saveNutrition, createEntry, entryTotals,
  dayTotals, dayMicros, MICRO_NUTRIENTS, fetchFoodByBarcode, searchFoodByName, mergeNutrition, nutritionBackup, readNutritionBackup } from '../lib/nutrition.js'
import { addFavorite, isFavorite, repeatMeal, createRecipe, recipeTotals, logRecipe, weeklyNutrition } from '../lib/nutrition-extra.js'
import { trainingEnergyForDay } from '../lib/training-energy.js'
import { nutrientOverview } from '../lib/nutrient-overview.js'
import { isMisattributedCreatine, repairMisattributedCreatine } from '../lib/creatine-repair.js'
import { omega3Pairs, mergeOmega3Pair } from '../lib/omega3-merge.js'
import { dailyFiberReport } from '../lib/fiber-report.js'
import { nutritionWeekAnalysis, frequentMeals, analyzeWeightTrend, similarMealSuggestions } from '../lib/nutrition-analysis.js'
import { ACTIVITY_CATALOG, activityEnergy, latestWeightKg, activityDaySummary } from '../lib/activity-energy.js'
import { healthStepStatus, healthStepsForDay } from '../lib/nutrition-health.js'
import NutritionTrendChart, { trendSeries } from '../lib/nutrition-trends.jsx'
import MacroRings from '../components/MacroRings.jsx'
import './Nutrition.css'

// Approximate adult reference values, not medical targets. Sodium is an upper guide, not a minimum.
const fmt = n => Math.round((Number(n) || 0) * 10) / 10
const EMPTY = () => ({ name: '', quantity: '100', unit: 'g', basis: 'g', pieceSize: '', date: dateLocal(), mealType: 'breakfast',
  per100: { kcal: '', protein: '', carbs: '', fat: '' }, per100Micros: {}, microsSources: {}, fiberSource: null, barcode: null, source: 'manual' })
const MEAL_GROUPS = [
  { id: 'breakfast', title: 'Frühstück', icon: 'coffee' },
  { id: 'lunch', title: 'Mittagessen', icon: 'plate' },
  { id: 'dinner', title: 'Abendessen', icon: 'plate' },
  { id: 'snack', title: 'Snacks', icon: 'sparkles' },
  { id: 'other', title: 'Weitere Einträge', icon: 'book' }
]
const SECTIONS = [['today','Heute','house'],['diary','Tagebuch','calendar'],['analysis','Trends','chart'],['recipes','Rezepte','plate'],['favorites','Favoriten','star'],['backup','Export / Import','download']]

export default function Nutrition() {
  const gym = useStore(s => s.S)
  const weight = gym.bodyweight?.at(-1)?.w
  const [data, setData] = useState(loadNutrition)
  const [tab, setTab] = useState('today')
  const [drawer, setDrawer] = useState(false)
  const [addMenu, setAddMenu] = useState(false)
  const [showWater, setShowWater] = useState(false)
  const [showNutritionExtras, setShowNutritionExtras] = useState(true)
  const [showMicros, setShowMicros] = useState(true)
  const [showSupplements, setShowSupplements] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState('breakfast')
  const [activityTypeId,setActivityTypeId] = useState('walk')
  const [activityLevel,setActivityLevel] = useState('1')
  const [activityMinutes,setActivityMinutes] = useState('40')
  const [activityWeightOverride,setActivityWeightOverride] = useState('')
  const [activityDistance,setActivityDistance] = useState('')
  const [activitySteps,setActivitySteps] = useState('')
  const [stepInfo,setStepInfo] = useState(null)
  const [showActivity, setShowActivity] = useState(false)
  const [date, setDate] = useState(dateLocal)
  // The page may stay mounted overnight on Android. Keep "today" moving while
  // leaving explicitly browsed historical days untouched.
  const currentLocalDay = useRef(dateLocal())
  useEffect(() => {
    const onResume = () => {
      const now = dateLocal()
      const previous = currentLocalDay.current
      if (now === previous) return
      currentLocalDay.current = now
      setDate(chosen => chosen === previous ? now : chosen)
    }
    const onVisibility = () => { if (!document.hidden) onResume() }
    const timer = window.setInterval(onResume, 60_000)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onResume)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onResume)
    }
  }, [])
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [fiberBusy, setFiberBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [camera, setCamera] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeServings, setRecipeServings] = useState(2)
  const [recipeSelected, setRecipeSelected] = useState([])
  const [suppName, setSuppName] = useState('')
  const [suppDose, setSuppDose] = useState('')
  const [suppUnit, setSuppUnit] = useState('piece')
  const [suppNutrient, setSuppNutrient] = useState('')
  const [suppAmount, setSuppAmount] = useState('')
  const [suppNutrients, setSuppNutrients] = useState({})
  const [editingSupplement, setEditingSupplement] = useState(null)
  const [suppFormOpen, setSuppFormOpen] = useState(false)
  const fileInput = useRef(null)
  const backupInput = useRef(null)
  const macroGoals = { ...data.goals, ...(() => { const kcal = Number(data.goals.kcal) || 2200; const protein = Number(data.goals.protein) || 150; const fat = Math.round(kcal * .28 / 9); const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4)); return { carbs: data.goals.carbs ?? carbs, fat: data.goals.fat ?? fat } })() }
  const totals = dayTotals(data.entries, date)
  const drank = data.water?.[date] || 0
  const training = trainingEnergyForDay(gym.workouts, date, weight, gym.unit)
  const activitySummary = activityDaySummary(data.activities || [],date,training.sessions.map(x=>({date})))
  const burned = activitySummary.net
  const displayedBurned = burned + training.kcal
  const activeBonus = data.profile?.includeActivityCalories ? activitySummary.sessions.filter(a=>a.source==='met_estimate').reduce((sum,a)=>sum+Number(a.kcalNet||0),0) : 0
  const inferredWeight=latestWeightKg(gym.bodyweight,date,gym.unit,weight)
  const activityWeight=Number(activityWeightOverride)>0?Number(activityWeightOverride):inferredWeight
  const activityEstimate=activityEnergy({type:activityTypeId,level:activityLevel,minutes:activityMinutes,
    weightKg:activityWeight,distanceKm:activityDistance,steps:activitySteps})
  const activitySelection=ACTIVITY_CATALOG.find(a=>a.id===activityTypeId)
  // Recorded and estimated exercise is displayed, but does not increase the deficit budget.
  const remaining = Math.round((data.goals.kcal || 0) + activeBonus - totals.kcal)
  const meals = data.entries.filter(e => e.date === date).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const unique = [...new Map([...data.entries].reverse().map(e => [`${e.name.toLowerCase()}-${e.unit}`, e])).values()].reverse().slice(0, 70)
  const week = nutritionWeekAnalysis(data.entries, date, macroGoals, gym.bodyweight, gym.unit)
  const [weightWindow, setWeightWindow] = useState('30')
  const trendData=trendSeries(data.entries,gym.bodyweight,date,weightWindow,gym.unit)
  const chartPoints=(weightWindow==='7'||weightWindow==='30')?trendData.daily:trendData.weekly
  const fullWeightTrend = analyzeWeightTrend(gym.bodyweight, date, weightWindow === 'all' ? 'all' : Number(weightWindow), gym.unit)
  const suggestedMeals = similarMealSuggestions(data.entries)
  const frequent = frequentMeals(data.entries)
  const nutrientRows = nutrientOverview(data, date)
  const fiberReport = dailyFiberReport(data.entries, date)
  const micros = Object.fromEntries(nutrientRows.filter(n => n.known).map(n => [n.key, n.total]))

  useEffect(() => {
    const onSaved = () => setData(loadNutrition())
    window.addEventListener('storage', onSaved)
    window.addEventListener('openform-nutrition-changed', onSaved)
    return () => { window.removeEventListener('storage', onSaved); window.removeEventListener('openform-nutrition-changed', onSaved) }
  }, [])
  const commit = next => {
    try { setData(saveNutrition(next)); setNotice('Gespeichert.'); return true }
    catch { setNotice('Speichern fehlgeschlagen. Bitte Speicher prüfen und ein Backup exportieren.'); return false }
  }
  const update = fn => commit(fn(loadNutrition()))
  const startNew = (type = selectedMeal) => { setSelectedMeal(type); setForm({ ...EMPTY(), date, mealType: type }); setEditing(null); setShowForm(true); setTab('food'); setAddMenu(false); setNotice('') }
  const edit = e => {
    setForm({ ...e, quantity: String(e.quantity), pieceSize: String(e.pieceSize ?? ''), per100: { ...e.per100 }, per100Micros: { ...e.per100Micros }, microsSources: { ...(e.microsSources || {}) } })
    setSelectedMeal(e.mealType || 'other'); setEditing(e.id); setShowForm(true); setTab('food'); setNotice('')
  }
  const log = (food, type = selectedMeal) => {
    try { update(d => ({ ...d, entries: [...d.entries, { ...repeatMeal(food, date), mealType: type }] })); setTab('today') }
    catch (err) { setNotice(err.message) }
  }
  const saveMeal = e => {
    e.preventDefault()
    try {
      if (Object.values(form.per100).some(v => v === '' || v == null)) throw new Error('Bitte alle vier Nährwerte eingeben (auch echte 0).')
      const next = createEntry({ ...form, id: editing, date: form.date })
      if (editing) {
        const existing = data.entries.find(e => e.id === editing)
        next.createdAt = existing?.createdAt ?? next.createdAt
        if (existing?.recipeId) { next.recipeId = existing.recipeId; next.recipeName = existing.recipeName }
      }
      if (update(d => ({ ...d, entries: editing ? d.entries.map(e => e.id === editing ? next : e) : [...d.entries, next] }))) {
        setShowForm(false); setEditing(null); setForm(EMPTY()); setTab('today')
      }
    } catch (err) { setNotice(err.message) }
  }
  const estimateFormMicros = async () => {
    if (form.basis !== 'g') { setNotice('KI-Schätzung nur für Lebensmittel auf Gramm-Basis.'); return }
    if (!form.name.trim()) { setNotice('Bitte einen Lebensmittelnamen angeben.'); return }
    setFiberBusy(true)
    try {
      const estimated = await estimateFood(form.name + ' (' + form.quantity + ' ' + form.unit + ')')
      const suggestions = Object.entries(estimated.per100Micros || {})
        .filter(([key,value]) => Number.isFinite(value) && value >= 0 &&
          MICRO_NUTRIENTS.some(n => n.key === key && !n.supplementOnly))
      if (!suggestions.length) throw new Error('KI konnte keine ausreichend plausiblen Mikronährstoffe schätzen.')
      const missing = suggestions.filter(([key]) => form.per100Micros?.[key] == null ||
        form.per100Micros?.[key] === '')
      if (!missing.length) { setNotice('Für alle geschätzten Nährstoffe liegen bereits Werte vor. Keine vorhandenen Daten überschrieben.'); return }
      setForm(old => {
        const micros = { ...old.per100Micros }
        const sources = { ...old.microsSources }
        let count = 0
        for (const [key,value] of missing) {
          if (micros[key] != null && micros[key] !== '') continue
          micros[key] = value
          sources[key] = 'ai_estimate'
          count++
        }
        return { ...old, per100Micros:micros, microsSources:sources,
          fiberSource:sources.fiber || old.fiberSource }
      })
      setNotice(missing.length + ' fehlende Nährstoffwerte durch KI geschätzt. Werte vor dem Speichern prüfen.')
    } catch(err) { setNotice(err?.message || 'KI-Schätzung fehlgeschlagen.') }
    finally { setFiberBusy(false) }
  }
  const setProduct = p => {
    setForm({ ...EMPTY(), name: p.name, quantity: String(p.estimatedGrams || 100), basis: p.basis, unit: p.basis,
      source: p.source, barcode: p.barcode, per100: p.per100, per100Micros: p.per100Micros || {}, microsSources: p.microsSources || {}, fiberSource: p.fiberSource || (p.per100Micros?.fiber != null ? 'database' : null), date, mealType: selectedMeal })
    setEditing(null); setShowForm(true); setTab('food'); setNotice('Produkt gefunden. Nährwerte und Portion vor dem Speichern prüfen.')
  }
  const lookup = async candidate => {
    setBusy(true); setNotice('')
    try { const p = await fetchFoodByBarcode(candidate); setBarcode(candidate); setProduct(p) }
    catch (err) { setNotice(err.message || 'Produkt konnte nicht geladen werden.') }
    finally { setBusy(false) }
  }
  const findFood = async e => {
    e.preventDefault(); setBusy(true); setResults([]); setNotice('')
    try {
      const found = await hybridFoodSearch(search)
      setResults(found.foods)
      if (found.estimated) setNotice('KI-Schätzung, keine verifizierten Herstellerwerte. Menge und Nährwerte vor dem Speichern prüfen.')
    } catch (err) { setNotice(err.message || 'Suche fehlgeschlagen.') }
    finally { setBusy(false) }
  }
  const scan = async () => {
    if (!MOBILE) { setCamera(true); return }
    try { const found = await scanCode(); if (found) await lookup(found.value) }
    catch { setNotice('Kamera nicht verfügbar. Barcode bitte eintippen.') }
  }
  const fromPhoto = async file => {
    if (!file) return
    try {
      let found
      if (MOBILE) found = await importCodeFromImage(file)
      else if (typeof BarcodeDetector !== 'undefined') {
        const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        const image = await createImageBitmap(file)
        try { const hits = await detector.detect(image); found = hits[0] && { value: hits[0].rawValue } }
        finally { image.close() }
      }
      if (found?.value) await lookup(found.value)
      else setNotice('Keinen Barcode erkannt. Für KI-Fotoanalyse brauchen wir später eine gesicherte API-Anbindung.')
    } catch { setNotice('Bild konnte nicht gelesen werden. Barcode bitte eintippen.') }
  }
  const exportBackup = () => {
    const blob = new Blob([nutritionBackup(data)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `openform-ernaehrung-${dateLocal()}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importBackup = async file => {
    if (!file) return
    try {
      const parsed = readNutritionBackup(await file.text())
      const added = parsed.entries.filter(e => !data.entries.some(old => old.id === e.id)).length
      if (commit(mergeNutrition(data, parsed))) setNotice(`${added} neue Einträge importiert; bestehende Einträge behalten.`)
    } catch (err) { setNotice(err.message || 'Import fehlgeschlagen.') }
  }
  const saveRecipe = e => {
    e.preventDefault()
    try {
      const selected = unique.filter(x => recipeSelected.includes(x.id))
      const recipe = createRecipe(recipeName, selected, recipeServings)
      if (update(d => ({ ...d, recipes: [...d.recipes, recipe] }))) { setRecipeName(''); setRecipeSelected([]) }
    } catch (err) { setNotice(err.message) }
  }
  const takeRecipe = recipe => {
    const amount = Number(window.prompt(`Wie viele Portionen „${recipe.name}“?`, '1'))
    if (!Number.isFinite(amount) || amount <= 0) return
    try { update(d => ({ ...d, entries: [...d.entries, ...logRecipe(recipe, amount, date).map(e => ({ ...e, mealType: selectedMeal }))] })); setTab('today') }
    catch (err) { setNotice(err.message) }
  }
  const addSupplement = e => {
    e.preventDefault()
    if (!suppName.trim() || !(Number(suppDose) > 0)) { setNotice('Name und Dosis prüfen.'); return }
    const previous = data.supplements.find(s => s.id === editingSupplement)
    const amount = suppAmount === '' ? null : Number(suppAmount)
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) { setNotice('Wirkstoffmenge prüfen.'); return }
    if (Object.values(suppNutrients).some(v => !Number.isFinite(Number(v)) || Number(v) < 0)) { setNotice('Wirkstoffe prüfen.'); return }
    const sameName = data.supplements.find(s => s.id !== editingSupplement && s.name.trim().toLocaleLowerCase('de') === suppName.trim().toLocaleLowerCase('de'))
    if (sameName && !window.confirm(`„${sameName.name}“ ist bereits vorhanden. Wirklich einen weiteren Eintrag anlegen?`)) return
    const nutrients = { ...suppNutrients }
    if (amount !== null && suppNutrient) nutrients[suppNutrient] = amount
    const supplement = { id: previous?.id ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`), name: suppName.trim(), dose: Number(suppDose), unit: suppUnit, nutrients: Object.fromEntries(Object.entries(nutrients).map(([k,v]) => [k, Number(v)])), logs: previous?.logs || [] }
    if (update(d => ({ ...d, supplements: previous ? d.supplements.map(s => s.id === previous.id ? supplement : s) : [...d.supplements, supplement] }))) resetSupplementForm()
  }
  const selectSupplementForEdit = s => {
    setEditingSupplement(s.id); setSuppName(s.name); setSuppDose(String(s.dose))
    setSuppUnit(s.unit); setSuppNutrients({ ...(s.nutrients || {}) })
    setSuppNutrient(''); setSuppAmount(''); setSuppFormOpen(true)
  }
  const resetSupplementForm = () => {
    setEditingSupplement(null); setSuppName(''); setSuppDose('')
    setSuppUnit('piece'); setSuppNutrient('')
    setSuppAmount(''); setSuppNutrients({}); setSuppFormOpen(false)
  }
  const repairCreatine = supplement => {
    if (!isMisattributedCreatine(supplement)) return
    if (!window.confirm('Dieser Kreatin-Eintrag enthält offenbar eine falsche Magnesium-Zuordnung. Soll Magnesium entfernt und Kreatin mit 1 g pro Gramm Produkt erfasst werden? Die gespeicherten Einnahmetage und deine Tagesmenge bleiben erhalten.')) return
    if (update(d => ({ ...d, supplements: d.supplements.map(s =>
      s.id === supplement.id ? (repairMisattributedCreatine(s) || s) : s
    ) }))) setNotice('Kreatin-Eintrag korrigiert. Magnesium wird dafür nicht mehr mitgerechnet.')
  }
  const mergeOmega3 = (left, right) => {
    const result = mergeOmega3Pair(data.supplements, left.id, right.id)
    if (!result.changed) {
      setNotice(result.reason === 'different-history'
        ? 'EPA und DHA haben unterschiedliche Einnahmetage. Zusammenführen ist gesperrt, damit keine Einnahmen erfunden werden. Bitte Historien prüfen.'
        : 'Diese beiden Einträge sind nicht sicher zusammenführbar.')
      return
    }
    if (!window.confirm('EPA und DHA in EIN Omega-3-Produkt zusammenführen? Die gleichen Einnahmetage bleiben erhalten. Der zweite Eintrag wird entfernt.')) return
    if (update(d => {
      const next = mergeOmega3Pair(d.supplements, left.id, right.id)
      return next.changed ? { ...d, supplements: next.supplements } : d
    })) setNotice('Omega-3 zusammengeführt. EPA und DHA bleiben getrennte Wirkstoffe in einem Produkt.')
  }
  const toggleSupplement = supplement => update(d => ({ ...d, supplements: d.supplements.map(s => s.id !== supplement.id ? s :
    { ...s, logs: s.logs.includes(date) ? s.logs.filter(x => x !== date) : [...s.logs, date] }) }))

  const openFood = (type = selectedMeal) => { setSelectedMeal(type); setShowForm(false); setTab('food'); setAddMenu(false); setDrawer(false); setNotice('') }
  const goSection = section => { setTab(section); setDrawer(false); setAddMenu(false); setShowForm(false); setNotice('') }
  const addWater = amount => update(d => ({ ...d, water: { ...d.water, [date]: Math.max(0, (d.water?.[date] || 0) + amount) } }))
  const saveActivity = e => {
    e.preventDefault()
    if(!activityEstimate){setNotice('Bitte gültige Dauer und Körpergewicht eingeben.');return}
    if(activityTypeId==='strength' && training.sessions.length){
      setNotice('Krafttraining ist an diesem Tag bereits im Trainingsprotokoll erfasst. Nicht doppelt speichern.');return
    }
    const item={...activityEstimate,id:globalThis.crypto?.randomUUID?.()??`activity-${Date.now()}`,
      date,createdAt:Date.now()}
    if(update(d=>({...d,activities:[...(d.activities||[]),item]}))){
      setShowActivity(false);setActivityDistance('');setActivitySteps('')
    }
  }
  useEffect(()=>{
    let alive=true
    healthStepStatus().then(status=>{
      if(status.granted && alive) healthStepsForDay(date).then(x=>{if(alive&&x.ok)setStepInfo(x)}).catch(()=>{})
      else if(alive)setStepInfo(null)
    }).catch(()=>{})
    return()=>{alive=false}
  },[date])
  useEffect(() => {
    if (!drawer && !addMenu) return
    const escape = e => { if (e.key === 'Escape') { setDrawer(false); setAddMenu(false) } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [drawer, addMenu])
  return <div className="narrow of-nutrition of-032">
    <header className="of-appbar">
      <div className="of-appbar-brand"><div><h1>Essen</h1></div></div>
      <button className="of-menu-trigger" type="button" aria-label="Ernährungsmenü öffnen" aria-expanded={drawer} onClick={() => setDrawer(true)}><span aria-hidden="true">☰</span></button>
    </header>
    {drawer && <div className="of-drawer-overlay" onClick={() => setDrawer(false)}>
      <aside className="of-drawer" role="dialog" aria-modal="true" aria-label="Ernährungsmenü" onClick={e => e.stopPropagation()}>
        <div className="of-drawer-head"><strong>Ernährung</strong><button aria-label="Menü schließen" onClick={() => setDrawer(false)}><Icon name="xmark" /></button></div>
        {SECTIONS.map(([id,label,icon]) => <button key={id} className={tab === id ? 'current' : ''} onClick={() => goSection(id)}><Icon name={icon} /> {label}</button>)}

      </aside>
    </div>}
    {tab !== 'today' && <div className="of-subview-head"><button type="button" onClick={() => goSection('today')} aria-label="Zurück zur Ernährung"><Icon name="chevronLeft" /></button><h2>{tab === 'food' ? (showForm ? 'Mahlzeit erfassen' : 'Lebensmittel') : SECTIONS.find(([id]) => id === tab)?.[1]}</h2></div>}
    {(tab === 'today' || tab === 'diary') && <div className="of-date of-date-032"><button onClick={() => setDate(v => shiftDay(v, -1))} aria-label="Vortag"><Icon name="chevronLeft" /></button>
      <input aria-label="Tag" type="date" value={date} onChange={e => setDate(e.target.value || dateLocal())} />
      <button onClick={() => setDate(v => shiftDay(v, 1))} aria-label="Nächster Tag"><Icon name="chevronRight" /></button>{date !== dateLocal() && <button type="button" className="of-return-today" onClick={() => setDate(dateLocal())}>Heute</button>}</div>}
    {notice && <div className="of-notice" role="status">{notice}</div>}
    {tab === 'today' && <>
      <div className="of-health-chips">
        <button className="of-health-chip" onClick={() => bwSheet()}><Icon name="scale" /><span>{weight != null ? `${fmt(weight)} ${gym.unit || 'kg'}` : 'Gewicht eintragen'}</span><Icon name="pencil" /></button>
        <div className="of-water-wrap"><button className="of-health-chip" onClick={() => setShowWater(v => !v)} aria-expanded={showWater}><span className="of-water-glyph">◈</span><span>{fmt(drank)} / {fmt(data.profile?.waterGoal || 1900)} ml</span><Icon name="plus" /></button>
          {showWater && <div className="of-water-menu" aria-label="Wasser erfassen"><b>Wasser trinken</b><div><button onClick={() => addWater(150)}>+150 ml</button><button onClick={() => addWater(250)}>+250 ml</button><button onClick={() => addWater(500)}>+500 ml</button><button onClick={() => addWater(-250)}>−250 ml</button></div><button className="of-water-close" onClick={() => setShowWater(false)}>Schließen</button></div>}
        </div>
      </div>
      <div className="of-water-fast" aria-label="Wasser schnell erfassen">
        <span>Wasser</span>
        <div className="of-water-meter" role="progressbar" aria-label="Wasser getrunken" aria-valuenow={drank} aria-valuemin="0" aria-valuemax={data.profile?.waterGoal || 1900}><span style={{ width: `${Math.min(100, 100 * drank / Math.max(1, data.profile?.waterGoal || 1900))}%` }}/></div>
        <button type="button" onClick={() => addWater(250)}>+250 ml</button>
        <button type="button" onClick={() => addWater(500)}>+500 ml</button>
      </div>
      <section className="of-calorie-card" aria-label="Kalorienbilanz">
        <div className="of-calorie-meta"><div><span className="of-calorie-symbol of-intake"><Icon name="download" /></span><strong>{fmt(totals.kcal)}</strong><small>zugeführt</small></div>
          <div><span className="of-calorie-symbol of-burn"><Icon name="flame" /></span><strong>{training.kcal ? `≈ ${fmt(displayedBurned)}` : fmt(displayedBurned)}</strong><small>{training.kcal ? 'Aktivität + Training (ca. verbrannt)' : 'Aktivität (ca. verbrannt)'}</small></div></div>
        <MacroRings
          totals={{ ...totals, kcal:totals.kcal }}
          goals={{ ...macroGoals, kcal:(data.goals.kcal||0)+activeBonus }}
          remaining={remaining}
        />
        <div className="of-calorie-foot of-calorie-breakdown">
          <div><span>Grundziel</span><strong>{fmt(data.goals.kcal)} kcal</strong></div>
          <div><span>Aktivitätsbonus {data.profile?.includeActivityCalories?'aktiv':'aus'}</span><strong>+ {fmt(activeBonus)} kcal</strong></div>
          <div><span>Wirksames Budget</span><strong>{fmt((data.goals.kcal||0)+activeBonus)} kcal</strong></div>
          <span>*Training und Schritte nicht automatisch gutgeschrieben; Verbrauch ist geschätzt.</span>
        </div>
      </section>
      <p className="of-dim" style={{margin:"6px 0 12px"}}>Kohlenhydrate und Fett: automatisch aus Kalorienziel und Protein berechnet, sofern kein eigenes Ziel gespeichert ist.</p>
      <section className="of-nutrients-accordion" aria-label="Zusätzliche Nährstoffe und Supplements">
        <button className="of-accordion-toggle" type="button" aria-expanded={showNutritionExtras} aria-controls="of-nutrition-details" onClick={() => setShowNutritionExtras(v => !v)}>
          <span><Icon name="clipboard" /> Nährstoffe &amp; Supplements</span>
          <span className="of-accordion-summary">{data.supplements.filter(x => x.logs.includes(date)).length}/{data.supplements.length} eingenommen <Icon name={showNutritionExtras ? 'chevronUp' : 'chevronDown'} /></span>
        </button>
        {showNutritionExtras && <div id="of-nutrition-details" className="of-accordion-body">
          <p className="of-micro-note">Makronährstoffe stehen bereits in der Tagesübersicht. Hier findest du nur Mikronährstoffe und Supplements.</p>
          <button type="button" className="of-micros-toggle" aria-expanded={showMicros} onClick={() => setShowMicros(v => !v)}>
            <span>Mikronährstoffe &amp; Ballaststoffe</span><span>{nutrientRows.filter(n => n.known).length} erfasst <Icon name={showMicros ? 'chevronUp' : 'chevronDown'} /></span>
          </button>
          {showMicros && <div className="of-micros-content">
            <p className="of-micro-note">Nur erfasste Mengen. Fehlende Angaben bleiben unbekannt. Details antippen.</p>
            <div className="of-micro-cards">
              <details className="of-micro-card of-micro-compact" key="fiber">
                <summary className="of-micro-summary">
                  <span className="of-micro-name">Ballaststoffe</span>
                  <span className="of-micro-value">{fmt(fiberReport.recorded)} g<small> / {fmt(fiberReport.target)} g</small></span>
                  <Icon name="chevronDown" />
                </summary>
                <div className="of-micro-details">
                  <div className="of-micro-track" role="progressbar" aria-label="Ballaststoffe" aria-valuenow={fiberReport.recorded} aria-valuemin={0} aria-valuemax={fiberReport.target}><span style={{width:`${fiberReport.progress}%`}} /></div>
                  <div>Erfasste Werte: {fmt(fiberReport.confirmed)} g · KI-geschätzt: {fmt(fiberReport.estimated)} g</div>
                  <div>{fiberReport.complete ? `Noch ${fmt(fiberReport.remaining)} g bis zum Orientierungswert.` : `${fiberReport.unknownCount} Lebensmittel ohne verwertbare Ballaststoffangabe. Die tatsächliche Tagesmenge ist unbekannt.`}</div>
                  <details className="of-fiber-sources">
                    <summary>Lebensmittelquellen ({fiberReport.knownCount}) und Datenlücken ({fiberReport.unknownCount})</summary>
                    {fiberReport.sources.length ? <div className="of-fiber-source-list">{fiberReport.sources.map((food,i) => <div key={food.id || i}><span>{food.name} <small>{fmt(food.quantity)} {food.unit}{food.estimated ? ' · KI-Schätzung' : ' · erfasster Wert'}</small></span><strong>{fmt(food.fiber)} g</strong></div>)}</div> : <p className="of-dim">Noch keine Lebensmittel mit Ballaststoffangaben erfasst.</p>}
                    {fiberReport.missing.length > 0 && <div className="of-fiber-missing"><strong>Angaben fehlen</strong>{fiberReport.missing.map((food,i) => <div key={food.id || i}>{food.name} ({fmt(food.quantity)} {food.unit})</div>)}<p>Lebensmittel bearbeiten und fehlende Nährstoffe per KI schätzen oder einen Etikettwert nachtragen.</p></div>}
                  </details>
                </div>
              </details>
              {nutrientRows.filter(n => n.known && n.key !== 'fiber').map(n => {

                const limitText = n.upper ? `Obergrenze: ${fmt(n.upper.max)} ${n.unit} (${n.upper.scope === 'supplement' ? 'nur aus Ergänzungen' : 'Gesamtaufnahme'})` : null
                return <details className={'of-micro-card of-micro-compact' + (n.limitExceeded ? ' of-micro-warning' : '')} key={n.key}>
                  <summary className="of-micro-summary">
                    <span className="of-micro-name">{n.label}{n.limitExceeded && <span className="of-micro-alert">⚠ Grenzwert prüfen</span>}</span>
                    <span className="of-micro-value">{fmt(n.total)} {n.unit}{n.guide != null && <small> / {fmt(n.guide)} {n.unit}</small>}</span>
                    <Icon name="chevronDown" />
                  </summary>
                  {n.guide != null && <div className="of-micro-track" role="progressbar" aria-label={n.label} aria-valuenow={n.total} aria-valuemin={0} aria-valuemax={n.guide}><span className={n.limitExceeded ? 'of-micro-over-fill' : ''} style={{width:`${Math.min(100,100*n.total / Math.max(1,n.guide))}%`}} /></div>}
                  <div className="of-micro-details">
                    <div>Nahrung: {n.food == null ? 'unbekannt' : `${fmt(n.food)} ${n.unit}`}</div>
                    <div>Supplements: {n.supplement == null ? 'nicht erfasst' : `${fmt(n.supplement)} ${n.unit}`}</div>
                    <div>Lebensmittelwerte: {fmt(n.confirmedFood)} {n.unit} erfasst · {fmt(n.estimatedFood)} {n.unit} KI-geschätzt</div>
                    {n.estimatedFood > 0 && <p>KI-Werte sind Näherungen und keine gemessenen Produktangaben.</p>}
                    {n.estimatedExceedance && <p>⚠ Geschätzte Gesamtaufnahme liegt über einer Obergrenze. Das ist keine bestätigte Überschreitung.</p>}
                    {n.incomplete && <p>Lebensmitteldaten unvollständig. Der tatsächliche Wert kann höher sein.</p>}
                    {n.guide != null && <p>{n.key === 'sodium' ? 'Orientierung zur Begrenzung, kein Mindestziel.' : 'Der Vergleichswert ist ein Orientierungswert, keine sichere Obergrenze.'}</p>}
                    {limitText && <p className={n.limitExceeded ? 'of-micro-over' : ''}>{n.limitExceeded ? '⚠ Erfasste Menge überschreitet den angegebenen Grenzwert. ' : ''}{limitText}. Bitte Dosierung und Produktform prüfen.</p>}
                    {n.key === 'magnesium' && <p>350 mg = täglicher Orientierungswert. 250 mg gilt nur für bestimmte ergänzte Magnesiumverbindungen und ist kein Zielwert.</p>}
                    {n.key === 'creatine' && <p>Kreatin ist kein Vitamin oder Mineralstoff. Hier wird nur die dokumentierte Einnahme angezeigt.</p>}
                  </div>
                </details>
              })}
            </div>
          </div>}
          <button type="button" className="of-micros-toggle of-supplements-toggle" aria-expanded={showSupplements} onClick={() => { setShowSupplements(v => !v); setSuppFormOpen(false); setEditingSupplement(null) }}>
            <span>Supplements {date === dateLocal() ? 'heute' : 'am ' + date.split('-').reverse().join('.')}</span>
            <span>{data.supplements.filter(s => s.logs.includes(date)).length}/{data.supplements.length} eingenommen <Icon name={showSupplements ? 'chevronUp' : 'chevronDown'} /></span>
          </button>
          {!showSupplements && <p className="of-dim of-supp-hint">{data.supplements.length ? 'Hier kannst du deine täglichen Einnahmen abhaken und die hinterlegten Dosierungen bearbeiten.' : 'Hier einmal deine Supplements und Tagesdosen hinterlegen, danach täglich abhaken.'}</p>}
          {showSupplements && <>
          {omega3Pairs(data.supplements).map(({left, right, review}) => <div className="of-omega3-merge" key={left.id + ':' + right.id}>
            <div><strong>Omega-3: EPA + DHA</strong><small>{review.allowed
              ? 'Gleiche Einnahmetage und Dosierung. Als ein Produkt speichern.'
              : 'Unterschiedliche Einnahmehistorie. Nicht automatisch zusammenführen.'}</small></div>
            <button type="button" onClick={() => mergeOmega3(left, right)} disabled={!review.allowed}
              aria-label="Omega-3-Einträge zusammenführen">Zusammenführen</button>
          </div>)}
          {data.supplements.map(s => <div className="of-inline-supp" key={s.id}>
            <label><input type="checkbox" checked={s.logs.includes(date)} onChange={() => toggleSupplement(s)} /><span><strong>{s.name}</strong><small>{fmt(s.dose)} {s.unit === 'piece' ? 'Stk.' : s.unit}{Object.entries(s.nutrients || {}).map(([k,v]) => { const nutrient = MICRO_NUTRIENTS.find(n => n.key === k); return nutrient ? ` · ${fmt(v)} ${nutrient.unit} ${nutrient.label} pro ${s.unit === 'piece' ? 'Stück' : s.unit}` : '' }).join('')}</small></span></label>
            {isMisattributedCreatine(s) && <button type="button" className="of-creatine-repair" onClick={() => repairCreatine(s)} aria-label="Kreatin-Zuordnung korrigieren">Kreatin korrigieren</button>}
            <button type="button" aria-label={`${s.name} bearbeiten`} onClick={() => selectSupplementForEdit(s)}><Icon name="pencil" /></button>
            <button type="button" aria-label={`${s.name} entfernen`} onClick={() => { if (window.confirm(`„${s.name}“ entfernen?`)) update(d => ({ ...d, supplements: d.supplements.filter(x => x.id !== s.id) })) }}><Icon name="trash" /></button>
          </div>)}
          {!data.supplements.length && <p className="of-dim">Noch keine Supplements angelegt.</p>}
          {!suppFormOpen && <button type="button" className="of-supp-open" onClick={() => { resetSupplementForm(); setSuppFormOpen(true) }}><Icon name="plus" /> Supplement hinzufügen</button>}
          {suppFormOpen && <form className="of-inline-supp-form" onSubmit={addSupplement}>
            <label className="of-supp-field">Supplement<input aria-label="Supplementname" placeholder="z. B. Magnesium" value={suppName} onChange={e => setSuppName(e.target.value)} required /></label>
            <div className="of-supp-form-row">
              <label className="of-supp-field">Anzahl / Menge<input aria-label="Tägliche Menge" type="number" min="0.01" step="any" placeholder="1" value={suppDose} onChange={e => setSuppDose(e.target.value)} required /></label>
              <label className="of-supp-field">Einheit<select aria-label="Einheit" value={suppUnit} onChange={e => setSuppUnit(e.target.value)}><option value="piece">Stk.</option><option value="g">g</option><option value="mg">mg</option><option value="ml">ml</option></select></label>
            </div>
            <div className="of-supp-form-row">
              <label className="of-supp-field">Enthaltener Nährstoff<select aria-label="Enthaltener Nährstoff" value={suppNutrient} onChange={e => setSuppNutrient(e.target.value)}><option value="">Wirkstoff auswählen</option>{MICRO_NUTRIENTS.map(n => <option value={n.key} key={n.key}>{n.label} ({n.unit})</option>)}</select></label>
              <label className="of-supp-field">Wirkstoffgehalt pro {suppUnit === 'piece' ? 'Stück' : suppUnit}<input aria-label="Wirkstoffgehalt pro Einheit" type="number" min="0" step="any" placeholder={MICRO_NUTRIENTS.find(n => n.key === suppNutrient)?.unit || 'mg'} value={suppAmount} onChange={e => setSuppAmount(e.target.value)} /></label>
            </div>
            <button type="button" className="of-supp-open" onClick={() => {
              if (!suppNutrient || suppAmount === '' || !Number.isFinite(Number(suppAmount)) || Number(suppAmount) < 0) { setNotice('Wirkstoff und Gehalt prüfen.'); return }
              setSuppNutrients(old => ({ ...old, [suppNutrient]: Number(suppAmount) }))
              setSuppAmount('')
            }}>Wirkstoff zur Liste hinzufügen</button>
            {Object.entries(suppNutrients).map(([key, val]) => <div key={key} className="of-inline-supp"><label style={{flex:1}}>{MICRO_NUTRIENTS.find(n => n.key === key)?.label || key} ({MICRO_NUTRIENTS.find(n => n.key === key)?.unit}) pro Einheit<input type="number" step="any" min="0" aria-label={key + ' Wirkstoffgehalt'} value={val} onChange={e => setSuppNutrients(old => ({ ...old, [key]: e.target.value }))} /></label><button type="button" aria-label={key + ' entfernen'} onClick={() => setSuppNutrients(old => Object.fromEntries(Object.entries(old).filter(([k]) => k !== key)))}><Icon name="trash" /></button></div>)}
            <button type="submit" aria-label={editingSupplement ? 'Supplement speichern' : 'Supplement hinzufügen'}>{editingSupplement ? 'Änderungen speichern' : 'Supplement hinzufügen'} <Icon name={editingSupplement ? 'check' : 'plus'} /></button>
            <button type="button" className="of-supp-cancel" onClick={() => { setSuppFormOpen(false); setEditingSupplement(null); setSuppAmount("") }}>Abbrechen</button>
          </form>}
          <p className="of-dim">Wirkstoffe und Mengen laut Etikett eintragen. Frühere Fehlzuordnungen werden nicht automatisch verändert. EPA und DHA sind Bestandteile von Omega-3.</p>
          </>}
        </div>}
      </section>
      <div className="of-plus-zone"><button className="of-big-plus" aria-label="Lebensmittel hinzufügen" aria-expanded={addMenu} onClick={() => setAddMenu(x => !x)}><Icon name={addMenu ? 'xmark' : 'plus'} /></button><p>{meals.length ? 'Mahlzeit hinzufügen' : 'Tippe auf +, um deine erste Mahlzeit zu erfassen'}</p>
        {addMenu && <div className="of-add-popover"><button onClick={() => openFood()}><Icon name="magnifier" /> Lebensmittel suchen</button><button onClick={() => { openFood(); scan() }}><Icon name="qr" /> Barcode scannen</button><button onClick={() => startNew()}><Icon name="pencil" /> Manuell eintragen</button><button onClick={() => { setAddMenu(false); fileInput.current?.click() }}><Icon name="image" /> Barcode aus Foto</button><button onClick={() => goSection('recipes')}><Icon name="plate" /> Rezept eintragen</button></div>}
      </div>
      <input hidden ref={fileInput} type="file" accept="image/*" onChange={async e => { await fromPhoto(e.target.files?.[0]); e.target.value = '' }} />
      <div className="of-day-groups">
        <section className="of-meal-section of-activity-section"><h2><span className="of-section-icon"><Icon name="figureRun" /></span>Aktivität <button className="of-section-more" onClick={() => setShowActivity(v => !v)} aria-label="Aktivität hinzufügen"><Icon name="plus" /></button></h2>
          {training.sessions.map(w => <div className="of-logged-row" key={`gym-${w.id}`}><span><strong>{w.name}</strong><small>≈ {w.kcal} kcal · {w.minutes} Min. · aus Trainingsdauer und Gewicht geschätzt</small></span></div>)}
          {(data.activities||[]).filter(a=>a.date===date).map(a=><div className="of-logged-row" key={a.id}>
            <span><strong>{a.name}</strong><small>{a.source==='manual_legacy'?'Manuell erfasst: '+fmt(a.kcal)+' kcal':
              `≈ ${fmt(a.kcalNet)} zusätzliche kcal · ${a.minutes} Min. · ${fmt(a.kcalGross)} kcal brutto (MET ${a.met})`}{a.source==='health_connect'?' · Health Connect':''}</small></span>
            <button aria-label="Aktivität löschen" onClick={()=>update(d=>({...d,activities:d.activities.filter(x=>x.id!==a.id)}))}><Icon name="trash"/></button>
          </div>)}
          {activitySummary.skipped>0 && <p className="of-dim">Krafttraining aus Aktivitäten nicht doppelt berücksichtigt.</p>}
          <div className="of-step-info">
            <span>{stepInfo?.date===date?`${stepInfo.steps.toLocaleString('de-DE')} Schritte (Health Connect)`:'Schritte aus Health Connect'}</span>
            <small>Verbindung über Einstellungen → Health Connect verwalten</small>
            <small>Schritte erhöhen das Kalorienbudget nicht. Freigaben erfolgen nur in den allgemeinen Einstellungen.</small>
          </div>
          <label className="of-budget-toggle"><input type="checkbox" checked={!!data.profile?.includeActivityCalories}
            onChange={e=>update(d=>({...d,profile:{...d.profile,includeActivityCalories:e.target.checked}}))}/>
            Zusätzliche MET-Aktivitätskalorien zum Tagesziel addieren (standardmäßig aus)</label>
          {showActivity && <form className="of-activity-form of-activity-smart" onSubmit={saveActivity}>
            <label>Aktivität<select value={activityTypeId} onChange={e=>{setActivityTypeId(e.target.value);setActivityLevel('1')}}>
              {ACTIVITY_CATALOG.map(a=><option value={a.id} key={a.id}>{a.label}</option>)}</select></label>
            <label>Intensität<select value={activityLevel} onChange={e=>setActivityLevel(e.target.value)}>
              {activitySelection?.levels.map(([label],i)=><option key={i} value={String(i)}>{label}</option>)}</select></label>
            <label>Dauer (Min.)<input aria-label="Dauer" type="number" min="1" max="720" value={activityMinutes} onChange={e=>setActivityMinutes(e.target.value)} required/></label>
            <label>Gewicht (kg, optional überschreiben)<input aria-label="Aktivitätsgewicht" type="number" min="25" max="300" step=".1" value={activityWeightOverride} placeholder={inferredWeight!=null?String(inferredWeight):'Bitte eintragen'} onChange={e=>setActivityWeightOverride(e.target.value)}/></label>
            <label>Distanz (km, optional)<input type="number" min="0" max="500" step=".1" value={activityDistance} onChange={e=>setActivityDistance(e.target.value)}/></label>
            <label>Schritte (optional)<input type="number" min="0" max="150000" value={activitySteps} onChange={e=>setActivitySteps(e.target.value)}/></label>
            <div className="of-activity-result"><strong>{activityEstimate?`≈ ${activityEstimate.kcalNet} kcal netto`:'Gewicht oder Dauer fehlt'}</strong>
              <small>{activityEstimate?`${activityEstimate.kcalGross} kcal brutto · MET ${activityEstimate.met}`:'Kein erfundener Kalorienwert'}</small></div>
            <button type="submit" disabled={!activityEstimate}>Aktivität speichern</button>
          </form>}
          {!showActivity && <button className="of-meal-add" onClick={() => setShowActivity(true)} aria-label="Aktivität erfassen"><Icon name="plus" /></button>}
        </section>
        {MEAL_GROUPS.filter(g => g.id !== 'other' || meals.some(m => (m.mealType || 'other') === 'other')).map(group => {
          const items = meals.filter(m => (m.mealType || 'other') === group.id)
          const kcal = items.reduce((a,m) => a + entryTotals(m).kcal, 0)
          return <section className="of-meal-section" key={group.id}>
            <h2><span className="of-section-icon"><Icon name={group.icon} /></span>{group.title}<small>{fmt(kcal)} kcal</small></h2>
            {items.map(m => { const t = entryTotals(m); return <div className="of-logged-row" key={m.id}><div><strong>{m.name}</strong><small>{fmt(m.quantity)} {m.unit === 'piece' ? 'Stk.' : m.unit} · {fmt(t.kcal)} kcal · {fmt(t.protein)} g Protein</small></div><div className="of-item-btn"><button aria-label={`Bearbeiten: ${m.name}`} onClick={() => edit(m)}><Icon name="pencil" /></button><button aria-label={`Favorit: ${m.name}`} className={isFavorite(data,m) ? 'of-fav-on' : ''} onClick={() => update(d => addFavorite(d,m))}><Icon name="star" /></button><button aria-label={`Wiederholen: ${m.name}`} onClick={() => log(m, group.id)}><Icon name="repeat" /></button><button aria-label={`Löschen: ${m.name}`} onClick={() => { if (window.confirm(`„${m.name}“ wirklich löschen?`)) update(d => ({ ...d, entries: d.entries.filter(e => e.id !== m.id) })) }}><Icon name="trash" /></button></div></div> })}
            <button className="of-meal-add" onClick={() => openFood(group.id)} aria-label={`${group.title} hinzufügen`}><Icon name="plus" /></button>
          </section>
        })}
      </div>
    </>}
    {tab === 'diary' && <div className="card of-week"><h2>Tagebuch</h2><p className="of-dim">Deine Einträge für den ausgewählten Tag. Tippe auf eine Mahlzeit, um sie zu bearbeiten.</p>
      <div className="of-diary-sum">{fmt(totals.kcal)} kcal · {fmt(totals.protein)} g Protein · {meals.length} Einträge</div>
      {meals.map(m => <button key={m.id} className="of-diary-row" onClick={() => edit(m)}><strong>{m.name}</strong><span>{fmt(entryTotals(m).kcal)} kcal <Icon name="pencil" /></span></button>)}
      {!meals.length && <p>Für diesen Tag ist noch keine Mahlzeit gespeichert.</p>}
    </div>}
    {tab === 'favorites' && <div className="card of-reusable"><h2>Favoriten</h2>{data.favorites.length ? data.favorites.map(f => <div className="of-reuse-row" key={f.id}><span>{f.food.name}</span><button onClick={() => { log(f.food, selectedMeal); goSection('today') }}>Eintragen</button></div>) : <p>Markiere Lebensmittel im Tagebuch mit dem Stern, um sie hier schnell wiederzufinden.</p>}</div>}
    {tab === 'food' && <>
      <div className="of-meal-context">Eintragen für <strong>{MEAL_GROUPS.find(g => g.id === selectedMeal)?.title || 'Snacks'}</strong></div>
      {!showForm && (data.favorites.length > 0 || unique.length > 0 || frequent.length > 0) && <section className="of-food-shortcuts" aria-label="Schnell eintragen">
        {!!frequent.length && <><h3><Icon name="repeat" /> Häufig gegessen</h3><div className="of-quick-food-list">{frequent.map(item => <button type="button" key={item.name + item.latest.unit} onClick={() => log(item.latest, item.latest.mealType || selectedMeal)}><strong>{item.name}</strong><small>{item.count}× bisher · {fmt(item.energy)} kcal · letzte Portion {fmt(item.latest.quantity)} {item.latest.unit}</small><span>+</span></button>)}</div></>}
        {!!data.favorites.length && <><h3><Icon name="star" /> Favoriten</h3><div className="of-quick-food-list">{data.favorites.slice(0,6).map(f => <button type="button" key={f.id} onClick={() => log(f.food)}><strong>{f.food.name}</strong><small>{fmt(entryTotals(f.food).kcal)} kcal · {fmt(entryTotals(f.food).protein)} g Protein</small><span>+</span></button>)}</div></>}
        {!!unique.length && <><h3><Icon name="repeat" /> Zuletzt gegessen</h3><div className="of-quick-food-list">{unique.filter(e => !isFavorite(data,e)).slice(0,5).map(e => <button type="button" key={e.id} onClick={() => log(e)}><strong>{e.name}</strong><small>{fmt(entryTotals(e).kcal)} kcal</small><span>+</span></button>)}</div></>}
      </section>}
      <div className="of-actions"><button onClick={() => startNew()}><Icon name="plus" /> Manuell</button><button onClick={scan}><Icon name="qr" /> Scannen</button>
        <button onClick={() => fileInput.current?.click()}><Icon name="image" /> Galerie</button>
        <input hidden ref={fileInput} type="file" accept="image/*" onChange={async e => { await fromPhoto(e.target.files?.[0]); e.target.value = '' }} /></div>
      <form className="card of-lookup" onSubmit={e => { e.preventDefault(); lookup(barcode) }}>
        <label htmlFor="food-barcode">Lebensmittel-Barcode</label>
        <div><input id="food-barcode" inputMode="numeric" placeholder="EAN eingeben" value={barcode} onChange={e => setBarcode(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? 'Suche…' : 'Suchen'}</button></div>
      </form>
      <form className="card of-lookup" onSubmit={findFood}><label htmlFor="food-name">Lebensmittel suchen (Datenbank + KI)</label>
        <div><input id="food-name" placeholder="z. B. Big Mac Menü oder 2 Semmeln" value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" disabled={busy}>Suchen</button></div></form>
      {!!results.length && <div className="card of-reusable"><h2>Suchergebnisse</h2>{results.map((p,i) => <div className="of-reuse-row" key={`${p.barcode}-${i}`}>
        <span>{p.name}<small>{fmt(p.per100.kcal)} kcal · {fmt(p.per100.protein)} g Protein / 100g{p.source === 'ai_estimate' ? ' · KI-Schätzung' : ''}</small></span>
        <button onClick={() => setProduct(p)}>Übernehmen</button></div>)}</div>}
      {camera && <FoodCameraScan onFound={async code => { setCamera(false); await lookup(code) }} onClose={() => setCamera(false)} />}
      {showForm && <form className="card of-form" onSubmit={saveMeal}>
        <h2>{editing ? 'Mahlzeit bearbeiten' : 'Mahlzeit hinzufügen'}</h2>
        <label>Mahlzeit<select value={form.mealType || 'other'} onChange={e => setForm(f => ({ ...f, mealType: e.target.value }))}>{MEAL_GROUPS.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
        <label>Name<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
        <label>Datum<input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></label>
        <div className="of-2-col"><label>Portion<input required type="number" min="0.01" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></label>
          <label>Einheit<select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value, basis: e.target.value === 'piece' ? f.basis : e.target.value }))}>
            <option value="g">Gramm</option><option value="ml">Milliliter</option><option value="piece">Stück</option></select></label></div>
        {form.unit === 'piece' && <div className="of-2-col"><label>Gramm/ml pro Stück<input required min="0.1" step="any" type="number" value={form.pieceSize} onChange={e => setForm(f => ({ ...f, pieceSize: e.target.value }))} /></label>
          <label>Basis<select value={form.basis} onChange={e => setForm(f => ({ ...f, basis: e.target.value }))}><option value="g">Gramm</option><option value="ml">Milliliter</option></select></label></div>}
        <div className="of-form-caption">Nährwerte pro 100 {form.basis}, nicht pro Portion</div>
        <div className="of-2-col">{[['kcal','Kalorien'],['protein','Protein'],['carbs','Kohlenhydrate'],['fat','Fett']].map(([k,label]) =>
          <label key={k}>{label} ({k === 'kcal' ? 'kcal' : 'g'})<input required type="number" min="0" step="any" value={form.per100[k]} onChange={e => setForm(f => ({ ...f, per100: { ...f.per100, [k]: e.target.value } }))} /></label>)}</div>
        <section className="of-fiber-input">
          <button type="button" disabled={fiberBusy || !form.name.trim() || form.basis !== 'g'}
            onClick={estimateFormMicros}>{fiberBusy ? 'KI analysiert…' : 'Fehlende Mikronährstoffe mit KI schätzen'}</button>
          <div className="of-dim">Die KI ergänzt nur fehlende Angaben. Vorhandene Datenbankwerte und deine Korrekturen bleiben erhalten.</div>
          {Object.values(form.microsSources || {}).some(v => v === 'ai_estimate') &&
            <div className="of-dim">KI-Schätzwerte vorhanden. Unter „Weitere Mikronährstoffe“ prüfen und bei Bedarf korrigieren.</div>}
        </section>
        <details className="of-optional-micros"><summary>Weitere Mikronährstoffe ergänzen (optional)</summary><p className="of-dim">Angaben pro 100 g/ml, nur bekannte Werte eintragen. Leere Felder bleiben unbekannt.</p><div className="of-2-col">{MICRO_NUTRIENTS.filter(n => n.key !== 'fiber' && !n.supplementOnly && !['omega3','epa','dha'].includes(n.key)).map(({key,label,unit}) => <label key={key}>{label} ({unit}){form.microsSources?.[key] === 'ai_estimate' ? ' · KI' : form.microsSources?.[key] === 'database' ? ' · DB' : ''}<input type="number" min="0" step="any" value={form.per100Micros?.[key] ?? ''} onChange={e => setForm(f => ({ ...f, per100Micros: {...f.per100Micros, [key]: e.target.value}, microsSources: {...f.microsSources, [key]: e.target.value === '' ? null : 'manual'} }))} /></label>)}</div></details>
        <div className="of-macro-sub">Portion: {fmt(entryTotals(form).kcal)} kcal · {fmt(entryTotals(form).protein)} g Protein</div>
        <div className="of-form-buttons"><button type="button" onClick={() => setShowForm(false)}>Abbrechen</button><button type="submit">{editing ? 'Aktualisieren' : 'Eintragen'}</button></div>
      </form>}
      {!!data.favorites.length && <div className="of-dim">Favoriten findest du jetzt oben in der Lebensmittelsuche.</div>}
    </>}
    {tab === 'recipes' && <>
      <div className="card of-form"><h2>Meine Rezepte</h2><p className="of-dim">Rezepte aus bereits erfassten Lebensmitteln zusammenstellen. Die Mengen bilden das ganze Rezept, Portionen teilen es auf.</p>
        <form className="of-recipe-builder" onSubmit={saveRecipe}>
          <label>Rezeptname<input required value={recipeName} onChange={e => setRecipeName(e.target.value)} placeholder="z. B. Hähnchen mit Reis" /></label>
          <label>Portionen aus dem Rezept<input required min="1" step="any" type="number" value={recipeServings} onChange={e => setRecipeServings(e.target.value)} /></label>
          <div className="of-dim">Zutaten auswählen (die Mengen kannst du vorher im Tagebuch bearbeiten):</div>
          {unique.length ? <div className="of-ingredients">{unique.map(m => <label key={m.id}><input type="checkbox" checked={recipeSelected.includes(m.id)}
            onChange={e => setRecipeSelected(xs => e.target.checked ? [...xs,m.id] : xs.filter(id => id !== m.id))} />{m.name} · {fmt(m.quantity)} {m.unit === 'piece' ? 'Stk.' : m.unit}</label>)}</div> : <p>Erfasse zuerst Zutaten im Lebensmittelbereich.</p>}
          <button className="of-primary" type="submit" disabled={!recipeSelected.length}>Rezept speichern</button>
        </form></div>
      {data.recipes.length ? data.recipes.map(r => { const t = recipeTotals(r); return <div className="card of-recipe" key={r.id}><strong>{r.name}</strong>
        <div className="of-dim">{r.items.length} Zutaten · {r.servings} Portionen · pro Portion {fmt(t.kcal)} kcal / {fmt(t.protein)} g Protein</div>
        <div className="of-recipe-actions"><button onClick={() => takeRecipe(r)}><Icon name="plus" /> Portion eintragen</button>
          <button aria-label="Rezept löschen" onClick={() => { if (window.confirm(`Rezept „${r.name}“ löschen?`)) update(d => ({ ...d, recipes: d.recipes.filter(x => x.id !== r.id) })) }}><Icon name="trash" /></button></div>
      </div> }) : <div className="of-empty">Noch keine Rezepte gespeichert.</div>}
    </>}
    {tab === 'analysis' && <>
      <section className="card of-week of-analysis">
        <h2>Ernährungsanalyse · 7 Tage</h2>
        <p className="of-dim">Durchschnitte nur aus Tagen mit Ernährungseinträgen. Nicht erfasste Tage sind keine Null-Tage. Einträge können unvollständig sein.</p>
        <div className="of-analysis-coverage"><strong>{week.daysLogged}/7 Tage erfasst</strong><span>{fmt(week.loggedCoverage)} % Abdeckung</span></div>
        <p className="of-analysis-quality">{week.quality === 'none' ? 'Noch keine auswertbaren Ernährungstage.' : week.quality === 'insufficient' ? 'Zu wenig Daten für eine Wochentendenz (unter 3 protokollierte Tage).' : week.quality === 'preliminary' ? 'Vorläufige Tendenz: erst 3–4 protokollierte Tage.' : 'Mindestens 5 Tage protokolliert. Vollständigkeit der Mahlzeiten trotzdem prüfen.'}</p>
        <div className="of-analysis-kpis">{[['kcal','Kalorien','kcal'],['protein','Protein','g'],['carbs','Kohlenhydrate','g'],['fat','Fett','g']].map(([key,label,unit]) => <div key={key}><span>Ø {label}</span><strong>{week.daysLogged ? fmt(week.average[key]) : '–'} <small>{unit}</small></strong></div>)}</div>
        <h3>Tag für Tag</h3>
        <div className="of-analysis-days">{week.days.map(d=><div key={d.date} className={'of-analysis-day' + (!d.consumed ? ' of-analysis-empty' : '')}>
          <strong>{d.date.slice(5)}</strong>
          <div className="of-analysis-meter"><span style={{width:`${d.consumed ? Math.min(100,100*d.kcal/Math.max(1,macroGoals.kcal)) : 0}%`}} /></div>
          <span>{d.consumed ? `${fmt(d.kcal)} kcal` : 'Keine Einträge'}</span>
          <small>{d.consumed ? `P ${fmt(d.protein)} · KH ${fmt(d.carbs)} · F ${fmt(d.fat)} g` : 'Keine Bewertung'}</small>
        </div>)}</div>
        <h3>Zielerreichung</h3>
        <div className="of-analysis-targets">{[['kcal','Kalorien (max.)'],['protein','Protein (min.)'],['fat','Fett (max.)']].map(([key,label]) => <div key={key}><span>{label}</span><strong>{week.goalStats[key].met}/{week.goalStats[key].evaluated} erfasste Tage</strong></div>)}</div>
        <p className="of-dim">Kohlenhydrate: Ø {fmt(week.average.carbs)} g. Das KH-Ziel dient als Orientierung; keine separate Erfolgsquote.</p>
      </section>
      <section className="card of-week of-analysis">
        <h2>Gewichtstrend</h2>
        <div className="of-analysis-range" role="group" aria-label="Gewicht Zeitfenster">
          {[['7','7 T.'],['30','30 T.'],['90','90 T.'],['all','Alle']].map(([value,label])=><button key={value} type="button" className={weightWindow===value?'active':''} onClick={()=>setWeightWindow(value)}>{label}</button>)}
        </div>
        {fullWeightTrend.weights.length ? <>
          <p className="of-dim">{fullWeightTrend.weights.length} Wägungen im gewählten Zeitraum · {fullWeightTrend.weeklyMeans.length} Wochen mit Messungen</p>
          <NutritionTrendChart data={chartPoints} field="weight" title="Körpergewicht" unit="kg" connectMissing target={gym.targetW!=null?Number(gym.targetW)*(gym.unit==='lb'?.45359237:1):null}/>
          <NutritionTrendChart data={trendData.weekly} field="weight" title="Wochenmittelgewicht" unit="kg" connectMissing color="#e8ae40"/>
          <div className="of-analysis-weights">{fullWeightTrend.weeklyMeans.map(w=><div key={w.date}><span>Woche ab {w.date.slice(5)} · {w.measurements} Messung{w.measurements!==1?'en':''}</span><strong>Ø {fmt(w.mean)} kg</strong></div>)}</div>
          <p>{fullWeightTrend.weightDelta === null ? 'Für eine Veränderung zwischen Wochenmittelwerten sind mindestens zwei Wochen nötig.' : `Veränderung erster zu letzter Wochenmittelung: ${fullWeightTrend.weightDelta>0?'+':''}${fmt(fullWeightTrend.weightDelta)} kg`}</p>
          {fullWeightTrend.limited && <p className="of-dim">Einzelne Wochen enthalten nur eine Messung. Ihre Mittelwerte sind besonders unsicher.</p>}
          <details className="of-analysis-weighins"><summary>Alle Einzelmessungen ({fullWeightTrend.weights.length})</summary>
            <div className="of-analysis-weights">{fullWeightTrend.weights.map(w=><div key={w.date}><span>{w.date}</span><strong>{fmt(w.weight)} kg</strong></div>)}</div>
          </details>
        </> : <p className="of-dim">Für diesen Zeitraum sind keine Gewichtsmessungen gespeichert.</p>}
        <p className="of-dim">Auch Wochenmittelwerte reagieren auf Wasser und Messzeitpunkte. Das ist keine Fettverlustmessung.</p>
      </section>
      <section className="card of-week of-analysis">
        <h2>Ernährung und Gewicht gemeinsam</h2>
        <p className="of-dim">Ernährung: Ø {week.daysLogged?fmt(week.average.kcal)+' kcal':'keine Daten'} an {week.daysLogged}/7 Tagen. Gewicht: {fullWeightTrend.weeklyMeans.length} Wochenmittel im gewählten Zeitraum. Unterschiedliche Zeitfenster erlauben keine direkte Ursachenbewertung.</p>
        <h3>Ernährungstrends ({weightWindow==='all'?'Gesamter Zeitraum':weightWindow+' Tage'})</h3>
        <NutritionTrendChart data={chartPoints} field="kcal" title="Kalorien" unit="kcal" target={macroGoals.kcal} bars color="#ff443c" minZero/>
        <NutritionTrendChart data={chartPoints} field="protein" title="Protein" unit="g" target={macroGoals.protein} bars color="#54a6ef" minZero/>
                <h3>Ø Abweichung vom Tagesziel</h3>
        <div className="of-analysis-targets">{[['kcal','Kalorien','kcal'],['protein','Protein','g'],['carbs','Kohlenhydrate','g'],['fat','Fett','g']].map(([key,label,unit])=><div key={key}><span>{label}</span><strong>{week.averageDeviation[key]===null?'–':`${week.averageDeviation[key]>0?'+':''}${fmt(week.averageDeviation[key])} ${unit}`}</strong></div>)}</div>
        <h3>Größte Kalorienbeiträge der Woche</h3>
        {week.mealContributions.length?<div className="of-analysis-targets">{week.mealContributions.map(item=><div key={item.name}><span>{item.name} ({item.count}×)</span><strong>{fmt(item.kcal)} kcal</strong></div>)}</div>:<p className="of-dim">Noch keine Einträge vorhanden.</p>}
        <p className="of-dim">Beiträge zeigen konsumierte Kalorien, nicht den Anteil an einer Zielüberschreitung. KH-Ziele sind Richtwerte.</p>
      </section>
      <section className="card of-week of-analysis">
        <h2>Häufige Mahlzeiten</h2>
        <p className="of-dim">Tippen, um die zuletzt verwendete Portion für den ausgewählten Tag erneut einzutragen.</p>
        {suggestedMeals.length ? <div className="of-analysis-frequent">{suggestedMeals.map(item=><div key={item.name+item.latest.unit}><span><strong>{item.name}</strong><small>{item.count}× · {fmt(item.energy)} kcal{item.related.length?' · Ähnlich: '+item.related.join(', '):''}</small></span><button type="button" onClick={()=>log(item.latest,item.latest.mealType||selectedMeal)}>+ Eintragen</button></div>)}</div> : <p>Erfasse zuerst Mahlzeiten, um sie hier wiederholen zu können.</p>}
      </section>
    </>}
    {tab === 'backup' && <div className="card of-backup">
      <h2>Datensicherung</h2>
      <p>Vollständige Backups sowie Spezialimporte für Ernährung und Training werden zentral unter Einstellungen → Daten & Backup verwaltet.</p>
      <button type="button" onClick={()=>window.location.assign('/settings/data')}>Daten & Backup öffnen</button>
    </div>}
  </div>
}
function Progress({ value, max }) { return <div className="of-bar" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max || 0}><span style={{ width: `${Math.min(100, max > 0 ? 100 * value / max : 0)}%` }} /></div> }
function shiftDay(value, amount) { const [year, month, day] = value.split('-').map(Number); return dateLocal(new Date(year, month - 1, day + amount)) }
function FoodCameraScan({ onFound, onClose }) {
  const video = useRef(null)
  const [error, setError] = useState('')
  const found = useCallback(onFound, [onFound])
  useEffect(() => {
    let stream, timer, cancelled = false
    const stop = () => { cancelled = true; clearTimeout(timer); stream?.getTracks().forEach(t => t.stop()) }
    ;(async () => {
      try {
        if (!globalThis.BarcodeDetector) throw new Error('Der Browser unterstützt keinen EAN-Scanner. Nummer bitte eintippen.')
        const scanner = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] })
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled || !video.current) { stop(); return }
        video.current.srcObject = stream
        await video.current.play()
        const tick = async () => {
          if (cancelled) return
          try { const codes = await scanner.detect(video.current); if (codes[0]?.rawValue) { stop(); found(codes[0].rawValue); return } }
          catch { /* retry next frame */ }
          timer = setTimeout(tick, 240)
        }
        tick()
      } catch (e) { if (!cancelled) setError(e.message || 'Keine Kamera verfügbar.') }
    })()
    return stop
  }, [found])
  return <div className="card of-camera"><h2>Barcode scannen</h2>{error ? <p>{error}</p> : <video ref={video} autoPlay muted playsInline />}
    <button onClick={onClose}>Schließen</button></div>
}
