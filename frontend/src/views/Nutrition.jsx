import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { MOBILE } from '../lib/mobile.js'
import { scanCode, importCodeFromImage } from '../lib/scan.js'
import { dateLocal, loadNutrition, saveNutrition, createEntry, entryTotals,
  dayTotals, fetchFoodByBarcode, searchFoodByName, mergeNutrition, nutritionBackup, readNutritionBackup } from '../lib/nutrition.js'
import { addFavorite, isFavorite, repeatMeal, createRecipe, recipeTotals, logRecipe, weeklyNutrition } from '../lib/nutrition-extra.js'
import './Nutrition.css'

const fmt = n => Math.round((Number(n) || 0) * 10) / 10
const EMPTY = () => ({ name: '', quantity: '100', unit: 'g', basis: 'g', pieceSize: '', date: dateLocal(),
  per100: { kcal: '', protein: '', carbs: '', fat: '' }, barcode: null, source: 'manual' })
const TABS = [['today', 'Heute'], ['food', 'Lebensmittel'], ['recipes', 'Rezepte'], ['analysis', 'Analyse'], ['supplements', 'Supplements']]

export default function Nutrition() {
  const nav = useNavigate()
  const [data, setData] = useState(loadNutrition)
  const [tab, setTab] = useState('today')
  const [date, setDate] = useState(dateLocal)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [barcode, setBarcode] = useState('')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [camera, setCamera] = useState(false)
  const [recipeName, setRecipeName] = useState('')
  const [recipeServings, setRecipeServings] = useState(2)
  const [recipeSelected, setRecipeSelected] = useState([])
  const [suppName, setSuppName] = useState('')
  const [suppDose, setSuppDose] = useState('')
  const [suppUnit, setSuppUnit] = useState('g')
  const fileInput = useRef(null)
  const backupInput = useRef(null)
  const totals = dayTotals(data.entries, date)
  const meals = data.entries.filter(e => e.date === date).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  const unique = [...new Map([...data.entries].reverse().map(e => [`${e.name.toLowerCase()}-${e.unit}`, e])).values()].reverse().slice(0, 70)
  const week = weeklyNutrition(data.entries, date, data.goals)

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
  const startNew = () => { setForm({ ...EMPTY(), date }); setEditing(null); setShowForm(true); setTab('food'); setNotice('') }
  const edit = e => {
    setForm({ ...e, quantity: String(e.quantity), pieceSize: String(e.pieceSize ?? ''), per100: { ...e.per100 } })
    setEditing(e.id); setShowForm(true); setTab('food'); setNotice('')
  }
  const log = food => {
    try { update(d => ({ ...d, entries: [...d.entries, repeatMeal(food, date)] })); setTab('today') }
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
      }
      if (update(d => ({ ...d, entries: editing ? d.entries.map(e => e.id === editing ? next : e) : [...d.entries, next] }))) {
        setShowForm(false); setEditing(null); setForm(EMPTY()); setTab('today')
      }
    } catch (err) { setNotice(err.message) }
  }
  const setProduct = p => {
    setForm({ ...EMPTY(), name: p.name, quantity: '100', basis: p.basis, unit: p.basis,
      source: p.source, barcode: p.barcode, per100: p.per100, date })
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
      const foods = await searchFoodByName(search)
      setResults(foods)
      if (!foods.length) setNotice('Keine vollständigen Nährwertdaten gefunden. Du kannst das Lebensmittel selbst eintragen.')
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
    try { update(d => ({ ...d, entries: [...d.entries, ...logRecipe(recipe, amount, date)] })); setTab('today') }
    catch (err) { setNotice(err.message) }
  }
  const addSupplement = e => {
    e.preventDefault()
    if (!suppName.trim() || !(Number(suppDose) > 0)) { setNotice('Name und Dosis prüfen.'); return }
    const supplement = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`, name: suppName.trim(), dose: Number(suppDose), unit: suppUnit, logs: [] }
    if (update(d => ({ ...d, supplements: [...d.supplements, supplement] }))) { setSuppName(''); setSuppDose('') }
  }
  const toggleSupplement = supplement => update(d => ({ ...d, supplements: d.supplements.map(s => s.id !== supplement.id ? s :
    { ...s, logs: s.logs.includes(date) ? s.logs.filter(x => x !== date) : [...s.logs, date] }) }))

  return <div className="narrow of-nutrition">
    <div className="hdr"><div><h1>Essen</h1><div className="sub">openForm · Ernährung</div></div>
      <button className="iconbtn" onClick={() => nav('/settings/nutrition-profile')} aria-label="Ernährungsprofil"><Icon name="gear" /></button></div>
    <div className="of-tabs" role="tablist" aria-label="Ernährungsbereiche">{TABS.map(([id, label]) =>
      <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'selected' : ''}
        onClick={() => { setTab(id); setShowForm(false); setNotice('') }}>{label}</button>)}</div>
    <div className="of-date"><button onClick={() => setDate(v => shiftDay(v, -1))} aria-label="Vortag"><Icon name="chevronLeft" /></button>
      <input aria-label="Tag" type="date" value={date} onChange={e => setDate(e.target.value || dateLocal())} />
      <button onClick={() => setDate(v => shiftDay(v, 1))} aria-label="Nächster Tag"><Icon name="chevronRight" /></button></div>
    {notice && <div className="of-notice" role="status">{notice}</div>}
    {tab === 'today' && <>
      <div className="card of-summary">
        <div className="of-macro-main"><div><span>Kalorien</span><strong>{fmt(totals.kcal)} <small>/ {fmt(data.goals.kcal)} kcal</small></strong></div>
          <div><span>Protein</span><strong>{fmt(totals.protein)} <small>/ {fmt(data.goals.protein)} g</small></strong></div></div>
        <Progress value={totals.kcal} max={data.goals.kcal} /><Progress value={totals.protein} max={data.goals.protein} />
        <div className="of-macro-sub"><span>Kohlenhydrate <b>{fmt(totals.carbs)} g{data.goals.carbs != null && ` / ${fmt(data.goals.carbs)} g`}</b></span><span>Fett <b>{fmt(totals.fat)} g{data.goals.fat != null && ` / ${fmt(data.goals.fat)} g`}</b></span></div>
        <div className="of-remaining">Noch {fmt(Math.max(0, data.goals.kcal - totals.kcal))} kcal und {fmt(Math.max(0, data.goals.protein - totals.protein))} g Protein bis zum Ziel.</div>
      </div>
      <div className="of-actions"><button onClick={startNew}><Icon name="plus" /> Mahlzeit hinzufügen</button><button onClick={() => setTab('food')}><Icon name="qr" /> Lebensmittel</button></div>
      {!!data.favorites.length && <div className="card of-reusable"><h2>Favoriten <small>Schnell eintragen</small></h2>
        {data.favorites.map(f => <div className="of-reuse-row" key={f.id}><span>{f.food.name}</span><button onClick={() => log(f.food)} aria-label={`${f.food.name} erneut eintragen`}><Icon name="plus" /> Eintragen</button></div>)}
      </div>}
      <div className="of-list-head"><h2>Ernährungstagebuch</h2><span>{meals.length} Einträge</span></div>
      {meals.length ? meals.map(m => { const t = entryTotals(m); return <div className="card of-meal" key={m.id}>
        <div><strong>{m.name}</strong>{m.recipeName && <div className="of-dim">Aus Rezept: {m.recipeName}</div>}
          <div className="sub">{fmt(m.quantity)} {m.unit === 'piece' ? 'Stk.' : m.unit} · {fmt(t.kcal)} kcal · {fmt(t.protein)} g Protein</div></div>
        <div className="of-item-btn"><button title="Wiederholen" aria-label="Wiederholen" onClick={() => log(m)}><Icon name="repeat" /></button>
          <button title="Favorit" aria-label="Favorit" className={isFavorite(data,m) ? 'of-fav-on' : ''} onClick={() => update(d => addFavorite(d,m))}><Icon name="pin" /></button>
          <button aria-label="Bearbeiten" onClick={() => edit(m)}><Icon name="pencil" /></button>
          <button aria-label="Löschen" onClick={() => { if (window.confirm(`„${m.name}“ wirklich löschen?`)) update(d => ({ ...d, entries: d.entries.filter(e => e.id !== m.id) })) }}><Icon name="trash" /></button></div></div> })
        : <div className="of-empty">Für diesen Tag sind noch keine Mahlzeiten eingetragen.</div>}
    </>}
    {tab === 'food' && <>
      <div className="of-actions"><button onClick={startNew}><Icon name="plus" /> Manuell</button><button onClick={scan}><Icon name="qr" /> Scannen</button>
        <button onClick={() => fileInput.current?.click()}><Icon name="image" /> Galerie</button>
        <input hidden ref={fileInput} type="file" accept="image/*" onChange={async e => { await fromPhoto(e.target.files?.[0]); e.target.value = '' }} /></div>
      <form className="card of-lookup" onSubmit={e => { e.preventDefault(); lookup(barcode) }}>
        <label htmlFor="food-barcode">Lebensmittel-Barcode</label>
        <div><input id="food-barcode" inputMode="numeric" placeholder="EAN eingeben" value={barcode} onChange={e => setBarcode(e.target.value)} />
        <button type="submit" disabled={busy}>{busy ? 'Suche…' : 'Suchen'}</button></div>
      </form>
      <form className="card of-lookup" onSubmit={findFood}><label htmlFor="food-name">Lebensmittel suchen (Open Food Facts)</label>
        <div><input id="food-name" placeholder="z. B. Skyr" value={search} onChange={e => setSearch(e.target.value)} />
          <button type="submit" disabled={busy}>Suchen</button></div></form>
      {!!results.length && <div className="card of-reusable"><h2>Suchergebnisse</h2>{results.map((p,i) => <div className="of-reuse-row" key={`${p.barcode}-${i}`}>
        <span>{p.name}<small>{fmt(p.per100.kcal)} kcal · {fmt(p.per100.protein)} g Protein / 100g</small></span>
        <button onClick={() => setProduct(p)}>Übernehmen</button></div>)}</div>}
      {camera && <FoodCameraScan onFound={async code => { setCamera(false); await lookup(code) }} onClose={() => setCamera(false)} />}
      {showForm && <form className="card of-form" onSubmit={saveMeal}>
        <h2>{editing ? 'Mahlzeit bearbeiten' : 'Mahlzeit hinzufügen'}</h2>
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
        <div className="of-macro-sub">Portion: {fmt(entryTotals(form).kcal)} kcal · {fmt(entryTotals(form).protein)} g Protein</div>
        <div className="of-form-buttons"><button type="button" onClick={() => setShowForm(false)}>Abbrechen</button><button type="submit">{editing ? 'Aktualisieren' : 'Eintragen'}</button></div>
      </form>}
      {!!data.favorites.length && <div className="card of-reusable"><h2>Favoriten</h2>{data.favorites.map(f => <div className="of-reuse-row" key={f.id}><span>{f.food.name}</span><button onClick={() => log(f.food)}>Eintragen</button></div>)}</div>}
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
      <div className="card of-week"><h2>Letzte 7 Tage</h2><p className="of-dim">Nur Tage mit Ernährungseinträgen zählen zum Durchschnitt. Leere Tage gelten nicht als Fastentage.</p>
        <div className="of-macro-main"><div><span>Ø Kalorien / erfasster Tag</span><strong>{week.average.kcal} <small>kcal</small></strong></div>
          <div><span>Ø Protein / erfasster Tag</span><strong>{week.average.protein} <small>g</small></strong></div></div>
        <div className="of-dim">{week.daysLogged} von 7 Tagen erfasst · Protein-Ziel an {week.goalsReached} Tagen erreicht</div>
        <div className="of-week-bars">{week.days.map(d => <div className="of-week-day" key={d.date} title={`${d.date}: ${d.kcal} kcal`}>
          <div className="of-week-bar"><span style={{ height: `${Math.min(100, data.goals.kcal ? d.kcal / data.goals.kcal * 100 : 0)}%` }} /></div>
          <small>{d.date.slice(8)}</small></div>)}</div>
        <div className="of-macro-sub"><span>Ø Kohlenhydrate <b>{week.average.carbs} g</b></span><span>Ø Fett <b>{week.average.fat} g</b></span></div>
      </div>
      <div className="card of-backup"><h2>Ernährungsbackup</h2><p>Die Ernährung bleibt vorerst getrennt vom Trainingsbackup. Ein Export umfasst Mahlzeiten, Favoriten, Rezepte, Supplements und Ziele.</p>
        <div className="of-actions"><button onClick={exportBackup}><Icon name="share" /> Export</button><button onClick={() => backupInput.current?.click()}><Icon name="download" /> Import</button>
          <input hidden type="file" ref={backupInput} accept=".json,application/json" onChange={async e => { await importBackup(e.target.files?.[0]); e.target.value = '' }} /></div>
      </div>
    </>}
    {tab === 'supplements' && <>
      <div className="card of-form"><h2>Supplements</h2><p className="of-dim">Hier erfasst du die Einnahme. Kalorienhaltige Supplements wie Proteinshakes zusätzlich im Ernährungstagebuch eintragen.</p>
        <form className="of-supp-form" onSubmit={addSupplement}>
          <label>Name<input required value={suppName} onChange={e => setSuppName(e.target.value)} placeholder="z. B. Kreatin" /></label>
          <div className="of-2-col"><label>Dosis<input required type="number" min="0.01" step="any" value={suppDose} onChange={e => setSuppDose(e.target.value)} /></label>
            <label>Einheit<select value={suppUnit} onChange={e => setSuppUnit(e.target.value)}><option value="g">g</option><option value="mg">mg</option><option value="ml">ml</option><option value="piece">Stück</option></select></label></div>
          <button className="of-primary" type="submit">Supplement hinzufügen</button>
        </form></div>
      {data.supplements.length ? data.supplements.map(s => <div className="card of-supp-item" key={s.id}>
        <label><input type="checkbox" checked={s.logs.includes(date)} onChange={() => toggleSupplement(s)} /> <span><strong>{s.name}</strong><small>{fmt(s.dose)} {s.unit === 'piece' ? 'Stk.' : s.unit} · {s.logs.includes(date) ? 'heute erfasst' : 'nicht erfasst'}</small></span></label>
        <button title="Entfernen" aria-label={`${s.name} löschen`} onClick={() => { if (window.confirm(`„${s.name}“ entfernen?`)) update(d => ({ ...d, supplements: d.supplements.filter(x => x.id !== s.id) })) }}><Icon name="trash" /></button>
      </div>) : <div className="of-empty">Noch keine Supplements eingerichtet.</div>}
    </>}
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
