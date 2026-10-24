import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { MOBILE } from '../lib/mobile.js'
import { scanCode, importCodeFromImage } from '../lib/scan.js'
import { dateLocal, loadNutrition, saveNutrition, createEntry, entryTotals,
  dayTotals, fetchFoodByBarcode, mergeNutrition, nutritionBackup, readNutritionBackup } from '../lib/nutrition.js'
import './Nutrition.css'

const fmt = n => Math.round((Number(n) || 0) * 10) / 10
const EMPTY = () => ({ name: '', quantity: '100', unit: 'g', basis: 'g', pieceSize: '', date: dateLocal(),
  per100: { kcal: '', protein: '', carbs: '', fat: '' }, barcode: null, source: 'manual' })

export default function Nutrition() {
  const nav = useNavigate()
  const [data, setData] = useState(loadNutrition)
  const [date, setDate] = useState(dateLocal)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [goalEdit, setGoalEdit] = useState(false)
  const [goalDraft, setGoalDraft] = useState(null)
  const [barcode, setBarcode] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [camera, setCamera] = useState(false)
  const fileInput = useRef(null)
  const backupInput = useRef(null)
  const totals = dayTotals(data.entries, date)
  const meals = data.entries.filter(e => e.date === date).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  useEffect(() => {
    const onSaved = () => setData(loadNutrition())
    window.addEventListener('storage', onSaved)
    window.addEventListener('openform-nutrition-changed', onSaved)
    return () => { window.removeEventListener('storage', onSaved); window.removeEventListener('openform-nutrition-changed', onSaved) }
  }, [])
  const commit = next => {
    try { setData(saveNutrition(next)); setNotice('Gespeichert.') ; return true }
    catch { setNotice('Speichern fehlgeschlagen. Prüfe den freien Speicher und exportiere ein Backup.'); return false }
  }
  const update = fn => commit(fn(loadNutrition()))
  const startNew = () => { setForm({ ...EMPTY(), date }); setEditing(null); setShowForm(true); setNotice('') }
  const edit = e => {
    setForm({ ...e, quantity: String(e.quantity), pieceSize: String(e.pieceSize ?? ''), per100: { ...e.per100 } })
    setEditing(e.id); setShowForm(true); setNotice('')
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
        setShowForm(false); setEditing(null); setForm(EMPTY())
      }
    } catch (err) { setNotice(err.message) }
  }
  const lookup = async candidate => {
    setBusy(true); setNotice('')
    try {
      const p = await fetchFoodByBarcode(candidate)
      setBarcode(candidate)
      setForm({ ...EMPTY(), name: p.name, quantity: '100', basis: p.basis, unit: p.basis,
        source: p.source, barcode: p.barcode, per100: p.per100, date })
      setEditing(null); setShowForm(true)
      setNotice('Produkt gefunden. Nährwerte und Portion vor dem Speichern prüfen.')
    } catch (err) { setNotice(err.message || 'Produkt konnte nicht geladen werden.') }
    finally { setBusy(false) }
  }
  const scan = async () => {
    if (!MOBILE) { setCamera(true); return }
    try { const found = await scanCode(); if (found) await lookup(found.value) }
    catch (err) { setNotice('Kamera nicht verfügbar oder keine Berechtigung. Barcode kann eingetippt werden.') }
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
      else setNotice('Keinen Lebensmittel-Barcode erkannt. Du kannst die Nummer eintippen.')
    } catch { setNotice('Bild konnte nicht gelesen werden. Barcode bitte eintippen.') }
  }
  const exportBackup = () => {
    const text = nutritionBackup(data)
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `openform-ernaehrung-${dateLocal()}.json`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const importBackup = async file => {
    if (!file) return
    try {
      const parsed = readNutritionBackup(await file.text())
      const added = parsed.entries.filter(e => !data.entries.some(old => old.id === e.id)).length
      if (commit(mergeNutrition(data, parsed))) setNotice(`${added} neue Ernährungseinträge importiert. Vorhandene Einträge erhalten.`)
    } catch (err) { setNotice(err.message || 'Import fehlgeschlagen.') }
  }
  const saveGoals = e => {
    e.preventDefault()
    const kcal = Number(goalDraft.kcal), protein = Number(goalDraft.protein)
    if (!Number.isFinite(kcal) || kcal <= 0 || !Number.isFinite(protein) || protein <= 0) { setNotice('Kalorien- und Proteinziele müssen größer als null sein.'); return }
    const optional = value => value === '' || value == null ? null : Number(value)
    if ([goalDraft.carbs, goalDraft.fat].some(value => value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0))) { setNotice('Makroziele dürfen nicht negativ sein.'); return }
    if (update(d => ({ ...d, goals: { kcal, protein, carbs: optional(goalDraft.carbs), fat: optional(goalDraft.fat) } }))) { setGoalEdit(false); setGoalDraft(null) }
  }

  return <div className="narrow of-nutrition">
    <div className="hdr"><div><h1>Ernährung</h1><div className="sub">openForm · Kalorien und Makros</div></div>
      <button className="iconbtn" onClick={() => nav('/home')} aria-label="Startseite"><Icon name="house" /></button></div>
    <div className="of-date"><button onClick={() => setDate(v => shiftDay(v, -1))} aria-label="Vortag"><Icon name="chevronLeft" /></button>
      <input aria-label="Tag" type="date" value={date} onChange={e => setDate(e.target.value || dateLocal())} />
      <button onClick={() => setDate(v => shiftDay(v, 1))} aria-label="Nächster Tag"><Icon name="chevronRight" /></button></div>
    <div className="card of-summary">
      <div className="of-macro-main"><div><span>Kalorien</span><strong>{fmt(totals.kcal)} <small>/ {fmt(data.goals.kcal)} kcal</small></strong></div>
        <div><span>Protein</span><strong>{fmt(totals.protein)} <small>/ {fmt(data.goals.protein)} g</small></strong></div></div>
      <Progress value={totals.kcal} max={data.goals.kcal} /><Progress value={totals.protein} max={data.goals.protein} />
      <div className="of-macro-sub"><span>Kohlenhydrate <b>{fmt(totals.carbs)} g</b></span><span>Fett <b>{fmt(totals.fat)} g</b></span></div>
      <div className="of-remaining">Noch {fmt(Math.max(0, data.goals.kcal - totals.kcal))} kcal und {fmt(Math.max(0, data.goals.protein - totals.protein))} g Protein bis zum Ziel.</div>
      <button className="of-text-btn" onClick={() => { setGoalEdit(v => !v); setGoalDraft({ ...data.goals }) }}>Tagesziele {goalEdit ? 'schließen' : 'ändern'}</button>
      {goalEdit && <form className="of-goals" onSubmit={saveGoals}>{[['kcal','Kalorien (kcal)'],['protein','Protein (g)'],['carbs','Kohlenhydrate (g)'],['fat','Fett (g)']].map(([k, label]) =>
        <label key={k}>{label}<input type="number" min="0" step="1" value={goalDraft?.[k] ?? ''} onChange={e => setGoalDraft(v => ({ ...v, [k]: e.target.value }))} /></label>)}<button type="submit" className="of-save-goals">Ziele speichern</button></form>}
    </div>

    <div className="of-actions"><button onClick={startNew}><Icon name="plus" /> Mahlzeit</button>
      <button onClick={scan}><Icon name="qr" /> Scan</button>
      <button onClick={() => fileInput.current?.click()}><Icon name="image" /> Bild</button>
      <input hidden ref={fileInput} type="file" accept="image/*" onChange={async e => { await fromPhoto(e.target.files?.[0]); e.target.value = '' }} /></div>
    <form className="card of-lookup" onSubmit={e => { e.preventDefault(); lookup(barcode) }}>
      <label htmlFor="food-barcode">Lebensmittel-Barcode</label>
      <div><input id="food-barcode" inputMode="numeric" placeholder="EAN eingeben" value={barcode} onChange={e => setBarcode(e.target.value)} />
      <button type="submit" disabled={busy}>{busy ? 'Suche…' : 'Suchen'}</button></div>
    </form>
    {camera && <FoodCameraScan onFound={async code => { setCamera(false); await lookup(code) }} onClose={() => setCamera(false)} />}
    {notice && <div className="of-notice" role="status">{notice}</div>}

    {showForm && <form className="card of-form" onSubmit={saveMeal}>
      <h2>{editing ? 'Mahlzeit bearbeiten' : 'Mahlzeit hinzufügen'}</h2>
      <label>Name<input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
      <label>Datum<input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></label>
      <div className="of-2-col"><label>Portion<input required type="number" min="0.1" step="any" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></label>
        <label>Einheit<select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value, basis: e.target.value === 'piece' ? f.basis : e.target.value }))}>
          <option value="g">Gramm</option><option value="ml">Milliliter</option><option value="piece">Stück</option></select></label></div>
      {form.unit === 'piece' && <div className="of-2-col"><label>Gramm/ml pro Stück<input required min="0.1" step="any" type="number" value={form.pieceSize} onChange={e => setForm(f => ({ ...f, pieceSize: e.target.value }))} /></label>
        <label>Basis<select value={form.basis} onChange={e => setForm(f => ({ ...f, basis: e.target.value }))}><option value="g">Gramm</option><option value="ml">Milliliter</option></select></label></div>}
      <div className="of-form-caption">Nährwerte pro 100 {form.basis}, nicht pro Portion</div>
      <div className="of-2-col">{[['kcal','Kalorien'],['protein','Protein'],['carbs','Kohlenhydrate'],['fat','Fett']].map(([k, label]) =>
        <label key={k}>{label} ({k === 'kcal' ? 'kcal' : 'g'})<input required type="number" min="0" step="any" value={form.per100[k]} onChange={e => setForm(f => ({ ...f, per100: { ...f.per100, [k]: e.target.value } }))} /></label>)}</div>
      <div className="of-macro-sub">Portion: {fmt(entryTotals(form).kcal)} kcal · {fmt(entryTotals(form).protein)} g Protein</div>
      <div className="of-form-buttons"><button type="button" onClick={() => setShowForm(false)}>Abbrechen</button><button type="submit">{editing ? 'Aktualisieren' : 'Eintragen'}</button></div>
    </form>}

    <div className="of-list-head"><h2>Mahlzeiten</h2><span>{meals.length} Einträge</span></div>
    {meals.length ? meals.map(m => {
      const t = entryTotals(m)
      return <div className="card of-meal" key={m.id}><div><strong>{m.name}</strong><div className="sub">{fmt(m.quantity)} {m.unit === 'piece' ? 'Stk.' : m.unit} · {fmt(t.kcal)} kcal · {fmt(t.protein)} g Protein</div></div>
        <div className="of-item-btn"><button aria-label="Bearbeiten" onClick={() => edit(m)}><Icon name="pencil" /></button>
          <button aria-label="Löschen" onClick={() => { if (window.confirm(`„${m.name}“ wirklich löschen?`)) update(d => ({ ...d, entries: d.entries.filter(e => e.id !== m.id) })) }}><Icon name="trash" /></button></div></div>
    }) : <div className="of-empty">Für diesen Tag sind noch keine Mahlzeiten eingetragen.</div>}

    <div className="card of-backup"><h2>Ernährungsbackup</h2><p>Die Ernährung bleibt in dieser ersten Version getrennt von deinem openGym-Backup. Bitte zusätzlich exportieren.</p>
      <div className="of-actions"><button onClick={exportBackup}><Icon name="share" /> Export</button>
        <button onClick={() => backupInput.current?.click()}><Icon name="download" /> Import</button>
        <input hidden type="file" ref={backupInput} accept=".json,application/json" onChange={async e => { await importBackup(e.target.files?.[0]); e.target.value = '' }} /></div>
    </div>
  </div>
}
function Progress({ value, max }) { return <div className="of-bar" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max || 0}><span style={{ width: `${Math.min(100, max > 0 ? 100 * value / max : 0)}%` }} /></div> }
function shiftDay(value, amount) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day + amount)
  return dateLocal(date)
}
// Browser food scanner: native BarcodeDetector reads EAN/UPC; manual entry remains available
// on browsers without it. Android APK uses ML Kit through scanCode instead.
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
