import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { MachineRepDetector } from '../lib/machine-reps.js'
import { repMotionAvailable, startRepMotion } from '../lib/rep-motion.js'

const noteStyle = {fontSize:13, lineHeight:1.45}
const actions = {display:'flex', flexWrap:'wrap', gap:8, marginTop:12}
const action = {border:'1px solid var(--sep)', background:'var(--surface)',color:'var(--label)',padding:'12px 14px',borderRadius:11,fontWeight:650}
const accent = { ...action,background:'var(--acc)',color:'var(--bg)' }

/**
 * Intentional two-stage measurement: calibrate on exactly THREE repetitions,
 * then measure a different set, stop, correct, and confirm. The counter is a
 * signal estimate, not a measured physical displacement. It never touches
 * workouts, sets or persistence until the user explicitly confirms.
 */
export function RepCounterSheet({ close, sessionId, entryIdx, setIdx, exId, initialReps, onApply }) {
  const [available, setAvailable] = useState(null)
  const [secured, setSecured] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [count, setCount] = useState(0)
  const [frames, setFrames] = useState(0)
  const [tempo, setTempo] = useState(null)
  const [notice, setNotice] = useState('')
  const detectorRef = useRef(new MachineRepDetector())
  const stopRef = useRef(null)
  const alive = useRef(true)

  const stopStream = async () => {
    const stop = stopRef.current
    stopRef.current = null
    if (stop) try { await stop() } catch { /* still unregister on close */ }
  }

  useEffect(() => {
    alive.current = true
    repMotionAvailable().then(ok => { if (alive.current) setAvailable(ok) })
    const onHide = () => {
      if (!document.hidden) return
      stopStream()
      detectorRef.current.stop()
      if (alive.current) {
        setPhase(p => p === 'counting' ? 'review' : p === 'calibrating' ? 'idle' : p)
        setNotice('Messung durch Hintergrundwechsel unterbrochen. Anzahl kontrollieren oder neu kalibrieren.')
      }
    }
    document.addEventListener('visibilitychange',onHide)
    return () => {
      alive.current = false
      document.removeEventListener('visibilitychange',onHide)
      stopStream()
      detectorRef.current.stop()
    }
  }, [])

  const startCalibration = async () => {
    if (!secured || available !== true) return
    setNotice('Genau drei vollständige Wiederholungen langsam ausführen. Danach bei stillstehendem Gerät „Kalibrierung stoppen“ drücken.')
    setFrames(0);setCount(0);setTempo(null)
    detectorRef.current.resetCalibration()
    try {
      const stop = await startRepMotion(point => {
        if (!alive.current) return
        if (detectorRef.current.collect(point) && detectorRef.current.samples.length % 12 === 0) setFrames(detectorRef.current.samples.length)
      })
      if (!alive.current) { await stop();return }
      stopRef.current = stop
      setPhase('calibrating')
    } catch(e){setNotice(e?.message || 'Sensor konnte nicht gestartet werden.');setPhase('idle')}
  }

  const finishCalibration = async () => {
    await stopStream()
    const result = detectorRef.current.finishCalibration()
    if (!alive.current) return
    if (!result.ok) {setNotice(result.reason);setPhase('idle');return}
    setTempo(Math.round(result.periodMs / 100) / 10)
    setNotice('Kalibrierung akzeptiert. Setze die Maschine zurück und beginne einen NEUEN Satz. Der Zähler startet bei 0.')
    setPhase('ready')
  }

  const startCount = async () => {
    if (!detectorRef.current.start()) return
    setNotice('Wiederholungen kontrolliert ausführen. Die Zahl ist nur eine Schätzung.')
    setCount(0);setFrames(0)
    try {
      const stop = await startRepMotion(point => {
        if (!alive.current) return
        const next = detectorRef.current.push(point)
        setCount(old => old === next ? old : next)
      })
      if (!alive.current) { await stop(); return }
      stopRef.current = stop
      setPhase('counting')
    } catch(e) {
      detectorRef.current.stop()
      setPhase('ready')
      setNotice(e?.message || 'Sensor konnte nicht gestartet werden.')
    }
  }

  const finishCount = async () => {
    await stopStream()
    const n=detectorRef.current.stop()
    if (!alive.current) return
    setCount(n)
    setPhase('review')
    setNotice('Bitte die erkannte Zahl mit deinem tatsächlichen Satz vergleichen. Du kannst sie korrigieren.')
  }

  const confirm = async () => {
    const state=useStore.getState().S.active
    const current=state?.entries?.[entryIdx]
    const row=current?.sets?.[setIdx]
    if (!state || state.id !== sessionId || current.id !== exId || !row || row.done || row.r !== initialReps) {
      setNotice('Training oder Satz wurde inzwischen verändert. Nichts überschrieben – bitte Zähler neu öffnen.')
      return
    }
    if (!Number.isInteger(count) || count < 1 || count > 200) {
      setNotice('Eine gültige Wiederholungszahl zwischen 1 und 200 eingeben.')
      return
    }
    await stopStream()
    if (!alive.current) return
    onApply(count)
    close()
  }

  const cancel = () => {stopStream();close()}
  return <section className="rep-motion-sheet" aria-label="Sensor-Wiederholungszähler">
    <h3 style={{marginBottom:6}}>Sensor-Wiederholungszähler <small style={{color:'var(--label-2)'}}>Beta</small></h3>
    <p className="muted small" style={noteStyle}>Nur für geeignete Maschinen mit sicherer, freigegebener Befestigung am beweglichen Teil. <strong>Handy niemals lose auf Gewichte legen, in Quetschstellen oder in den Bewegungsweg bringen.</strong> Bei Unsicherheit den Modus nicht verwenden.</p>
    <label style={{display:'flex',gap:10,alignItems:'start',fontSize:14,margin:'14px 0'}}>
      <input type="checkbox" checked={secured} disabled={phase==='calibrating'||phase==='counting'} onChange={e=>setSecured(e.target.checked)} />
      <span>Ich habe eine sichere Befestigung geprüft und die Verwendung an diesem Gerät ist erlaubt.</span>
    </label>
    {available === null && <p className="muted small">Prüfe Bewegungssensor …</p>}
    {available === false && <p role="status" style={noteStyle}>Kein nutzbarer Android-Bewegungssensor gefunden. Der normale Trainingsmodus bleibt unverändert.</p>}
    <div style={{border:'1px solid var(--sep)',background:'var(--surface)',borderRadius:16,padding:18,textAlign:'center',margin:'12px 0'}}>
      <div style={{fontSize:12,color:'var(--label-2)',fontWeight:650}}>{phase==='calibrating'?'KALIBRIERUNG · 3 WIEDERHOLUNGEN':phase==='counting'?'AUTOMATISCH GESCHÄTZT':'WIEDERHOLUNGEN'}</div>
      <div aria-live="polite" style={{fontSize:62,fontWeight:750,fontVariantNumeric:'tabular-nums'}}>{phase==='calibrating'?'3':count}</div>
      {tempo && <p className="muted small">Gelernter Rhythmus: etwa {tempo.toLocaleString('de-AT')} Sekunden pro Wiederholung</p>}
      {phase==='calibrating' && <p className="muted small">{frames} Sensormesspunkte</p>}
    </div>
    {notice && <p role="status" style={{...noteStyle,color:'var(--label-2)'}}>{notice}</p>}
    {phase==='idle' && <div style={actions}><button style={accent} disabled={!secured || available!==true} onClick={startCalibration}>3 Wiederholungen kalibrieren</button><button style={action} onClick={cancel}>Abbrechen</button></div>}
    {phase==='calibrating' && <div style={actions}><button style={accent} onClick={finishCalibration}>Kalibrierung stoppen</button><button style={action} onClick={cancel}>Abbrechen</button></div>}
    {phase==='ready' && <div style={actions}><button style={accent} disabled={!secured} onClick={startCount}>Neuen Satz zählen</button><button style={action} onClick={startCalibration}>Neu kalibrieren</button><button style={action} onClick={cancel}>Schließen</button></div>}
    {phase==='counting' && <div style={actions}><button style={accent} onClick={finishCount}>Messung beenden</button><button style={action} onClick={cancel}>Verwerfen</button></div>}
    {phase==='review' && <>
      <label style={{display:'block',fontSize:13,marginBottom:7,fontWeight:650}}>Erkanntes Ergebnis kontrollieren</label>
      <div style={{display:'flex',gap:9,alignItems:'center',marginBottom:12}}>
        <button style={action} aria-label="Eine Wiederholung weniger" onClick={()=>setCount(n=>Math.max(0,n-1))}>−</button>
        <input aria-label="Gezählte Wiederholungen" type="number" min="0" max="200" step="1" value={count}
          onChange={e=>setCount(e.target.value===''?0:Math.max(0,Math.min(200,Math.floor(Number(e.target.value)||0))))}
          style={{width:100,textAlign:'center',borderRadius:10,padding:10,background:'var(--surface)',color:'var(--label)',border:'1px solid var(--sep)'}}/>
        <button style={action} aria-label="Eine Wiederholung mehr" onClick={()=>setCount(n=>Math.min(200,n+1))}>+</button>
      </div>
      <p className="muted small">Nur das Wiederholungsfeld wird nach Bestätigung geändert. Der Satz wird nicht automatisch abgeschlossen.</p>
      <div style={actions}><button style={accent} onClick={confirm}>Für Satz übernehmen</button><button style={action} onClick={startCount}>Erneut messen</button><button style={action} onClick={cancel}>Verwerfen</button></div>
    </>}
  </section>
}

export function repCounterSheet(options) {
  return useUI.getState().openSheet(close => <RepCounterSheet close={close} {...options} />)
}
