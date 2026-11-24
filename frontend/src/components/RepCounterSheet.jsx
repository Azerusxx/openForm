import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { MachineRepDetector } from '../lib/machine-reps.js'
import { HeightRepDetector } from '../lib/height-reps.js'
import { repHeightStatus, repHeightDiagnostics, startRepHeight } from '../lib/rep-height.js'
import { repMotionStatus, startRepMotion } from '../lib/rep-motion.js'

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
  const [status, setStatus] = useState(null)
  const [heightStatus, setHeightStatus] = useState(null)
  // Height is the preferred mode for a flat phone carried by the weight stack.
  // The old acceleration counter remains a manual fallback without a barometer.
  const [sensorMode, setSensorMode] = useState('height')
  const available = (sensorMode === 'height' ? heightStatus : status)?.available === true
  const [secured, setSecured] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [count, setCount] = useState(0)
  const [frames, setFrames] = useState(0)
  const [tempo, setTempo] = useState(null)
  const [heightCm, setHeightCm] = useState(null)
  const [amplitudeCm, setAmplitudeCm] = useState(null)
  const [notice, setNotice] = useState('')
  const [live, setLive] = useState({received:0, heightCm:null, maxCm:0, pressureHpa:null, acceleration:null})
  const [nativeHealth, setNativeHealth] = useState(null)
  const [liveSeconds, setLiveSeconds] = useState(0)
  const detectorRef = useRef(new MachineRepDetector())
  const heightRef = useRef(new HeightRepDetector())
  const sensorDetector = () => sensorMode === 'height' ? heightRef.current : detectorRef.current
  const stopRef = useRef(null)
  const alive = useRef(true)

  const stopStream = async () => {
    const stop = stopRef.current
    stopRef.current = null
    if (stop) try { await stop() } catch { /* still unregister on close */ }
  }

  const checkSensor = async () => {
    const [nextMotion, nextHeight] = await Promise.all([repMotionStatus(),repHeightStatus()])
    if (alive.current) {
      setStatus(nextMotion)
      setHeightStatus(nextHeight)
    }
  }

  useEffect(() => {
    alive.current = true
    checkSensor()
    const onHide = () => {
      if (!document.hidden) return
      stopStream()
      detectorRef.current.stop()
      heightRef.current.stop()
      if (alive.current) {
        setPhase(p => p === 'counting' ? 'review' : (p === 'calibrating' || p === 'diagnosing') ? 'idle' : p)
        setNotice('Messung durch Hintergrundwechsel unterbrochen. Anzahl kontrollieren oder neu kalibrieren.')
      }
    }
    document.addEventListener('visibilitychange',onHide)
    return () => {
      alive.current = false
      document.removeEventListener('visibilitychange',onHide)
      stopStream()
      detectorRef.current.stop()
      heightRef.current.stop()
    }
  }, [])

  const switchMode = next => {
    if (phase === 'diagnosing') return
    if (phase === 'calibrating' || phase === 'counting') return
    setSensorMode(next)
    detectorRef.current.resetCalibration()
    heightRef.current.resetCalibration()
    setPhase('idle')
    setFrames(0)
    setCount(0)
    setTempo(null)
    setHeightCm(null)
    setAmplitudeCm(null)
    setNotice('')
    setNativeHealth(null)
    setLive({received:0,heightCm:null,maxCm:0,pressureHpa:null,acceleration:null})
  }

  // Independent hardware check: no calibration, no mounting checkbox, and
  // absolutely no writes to workout state. This is safe for handheld testing.
  const startLiveTest = async () => {
    if (!available || phase === 'calibrating' || phase === 'counting' || phase === 'diagnosing') return
    setNotice('Live-Test aktiv. Smartphone ruhig halten und langsam um etwa einen Meter anheben und wieder absenken. Die Rohwerte müssen sich ändern.')
    setLive({received:0,heightCm:null,maxCm:0,pressureHpa:null,acceleration:null})
    setNativeHealth(null)
    setLiveSeconds(0)
    try {
      const stop = await (sensorMode === 'height'
        ? startRepHeight(point => {
            if (!alive.current) return
            const value = Number(point?.h)
            const pressure = Number(point?.p)
            if (!Number.isFinite(value)) return
            const h = value * 100
            setLive(prev => ({
              received: prev.received+1,
              heightCm: h,
              maxCm: Math.max(prev.maxCm,Math.abs(h)),
              pressureHpa: Number.isFinite(pressure) ? pressure : null,
              acceleration:null,
            }))
          })
        : startRepMotion(point => {
            if (!alive.current) return
            const x=Number(point?.x),y=Number(point?.y),z=Number(point?.z)
            if (![x,y,z].every(Number.isFinite)) return
            const magnitude=Math.sqrt(x*x+y*y+z*z)
            setLive(prev=>({...prev,received:prev.received+1,acceleration:magnitude}))
          }))
      if (!alive.current) { await stop(); return }
      stopRef.current = stop
      setPhase('diagnosing')
    } catch(e) {
      setNotice(e?.message || 'Live-Sensor konnte nicht gestartet werden.')
    }
  }

  const finishLiveTest = async () => {
    await stopStream()
    if (!alive.current) return
    setPhase('idle')
    setNotice('Live-Test beendet. Die Messung verändert keine Trainingsdaten.')
  }

  useEffect(() => {
    if (phase !== 'diagnosing') return
    let alivePoll=true
    const poll=async()=>{
      if (sensorMode !== 'height') return
      const health=await repHeightDiagnostics()
      if (alivePoll) setNativeHealth(health)
    }
    poll()
    const interval=setInterval(()=>{
      setLiveSeconds(old=>old+1)
      poll()
    },1000)
    return ()=>{alivePoll=false;clearInterval(interval)}
  },[phase,sensorMode])

  const startCalibration = async () => {
    if (!secured || !available) return
    setNotice(sensorMode === 'height'
      ? 'Gewichtsblock unten ruhig halten, dann drei vollständige Auf-und-ab-Bewegungen. Zum Schluss wieder ganz absetzen und Kalibrierung stoppen.'
      : 'Genau drei vollständige Wiederholungen langsam ausführen. Danach bei stillstehendem Gerät „Kalibrierung stoppen“ drücken.')
    setFrames(0);setCount(0);setTempo(null);setHeightCm(null);setAmplitudeCm(null)
    sensorDetector().resetCalibration()
    try {
      const stop = await (sensorMode === 'height'
        ? startRepHeight(point => {
            if (!alive.current) return
            if (heightRef.current.collect(point)) {
              setFrames(old => old+1)
              setHeightCm(Math.round(heightRef.current.height*100))
            }
          })
        : startRepMotion(point => {
            if (!alive.current) return
            if (detectorRef.current.collect(point) && detectorRef.current.samples.length % 12 === 0) setFrames(detectorRef.current.samples.length)
          }))
      if (!alive.current) { await stop();return }
      stopRef.current = stop
      setPhase('calibrating')
    } catch(e){setNotice(e?.message || 'Sensor konnte nicht gestartet werden.');setPhase('idle')}
  }

  const finishCalibration = async () => {
    await stopStream()
    const result = sensorDetector().finishCalibration()
    if (!alive.current) return
    if (!result.ok) {setNotice(result.reason + (frames < 12 ? ' Falls keine Messpunkte erscheinen, Sensordiagnose prüfen.' : ''));setPhase('idle');return}
    setTempo(Math.round(result.periodMs / 100) / 10)
    setAmplitudeCm(result.heightCm ?? null)
    setNotice('Kalibrierung akzeptiert. Setze die Maschine zurück und beginne einen NEUEN Satz. Der Zähler startet bei 0.')
    setPhase('ready')
  }

  const startCount = async () => {
    if (!sensorDetector().start()) return
    setNotice('Wiederholungen kontrolliert ausführen. Die Zahl ist nur eine Schätzung.')
    setCount(0);setFrames(0)
    try {
      const stop = await (sensorMode === 'height'
        ? startRepHeight(point => {
            if (!alive.current) return
            const next = heightRef.current.push(point)
            setHeightCm(Math.round(heightRef.current.height*100))
            setFrames(old => old+1)
            setCount(old => old===next?old:next)
          })
        : startRepMotion(point => {
            if (!alive.current) return
            const next = detectorRef.current.push(point)
            setFrames(old => old+1)
            setCount(old => old===next?old:next)
          }))
      if (!alive.current) { await stop(); return }
      stopRef.current = stop
      setPhase('counting')
    } catch(e) {
      sensorDetector().stop()
      setPhase('ready')
      setNotice(e?.message || 'Sensor konnte nicht gestartet werden.')
    }
  }

  const finishCount = async () => {
    await stopStream()
    const n=sensorDetector().stop()
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
    <p className="muted small" style={noteStyle}>Für geführte Maschinen: Das Handy darf <strong>flach auf dem beweglichen Gewichtsblock</strong> liegen, wenn es mit einer sicheren, vom Studio erlaubten Halterung befestigt ist. Ein Magnet allein ist bei Ruckbewegungen möglicherweise nicht ausreichend. <strong>Niemals lose auflegen, in Quetschstellen oder in den Bewegungsweg bringen.</strong> Magnetfelder können den Kompass stören, der Höhenmodus verwendet ihn nicht.</p>
    <label style={{display:'flex',gap:10,alignItems:'start',fontSize:14,margin:'14px 0'}}>
      <input type="checkbox" checked={secured} disabled={phase==='calibrating'||phase==='counting'} onChange={e=>setSecured(e.target.checked)} />
      <span>Ich habe eine sichere Befestigung geprüft und die Verwendung an diesem Gerät ist erlaubt.</span>
    </label>
    <div role="group" aria-label="Messmethode auswählen" style={{display:'flex',gap:8,margin:'12px 0',flexWrap:'wrap'}}>
      <button type="button" aria-pressed={sensorMode==='height'} disabled={phase==='calibrating'||phase==='counting'||phase==='diagnosing'}
        style={sensorMode==='height'?accent:action} onClick={()=>switchMode('height')}>Höhenmessung (Barometer)</button>
      <button type="button" aria-pressed={sensorMode==='motion'} disabled={phase==='calibrating'||phase==='counting'||phase==='diagnosing'}
        style={sensorMode==='motion'?accent:action} onClick={()=>switchMode('motion')}>Bewegungssensor</button>
    </div>
    {sensorMode==='height' && <p className="muted small" style={noteStyle}>
      Misst die relative Höhe des Gewichtsblocks unabhängig davon, ob das Handy flach liegt.
      Nur mit Barometer; bei kurzen Hüben oder Luftdruckrauschen kann die Kalibrierung scheitern.
      Am unteren Anschlag vor dem Start ca. 1 Sekunde stillhalten.
    </p>}
    <div style={{border:'1px solid var(--sep)',borderRadius:12,padding:12,margin:'10px 0'}}>
      <strong style={{fontSize:13}}>Sensor-Diagnose · {sensorMode==='height'?'Höhe':'Bewegung'}</strong>
      {(sensorMode==='height'?heightStatus:status) === null
        ? <p role="status" className="muted small">Prüfe Sensor …</p>
        : available
          ? <p role="status" className="muted small" style={{marginBottom:4}}>
              Sensor erkannt: {sensorMode==='height'?'Barometer (relativer Luftdruck)':status.mode === 'accelerometer' ? 'Beschleunigungssensor (Fallback mit Schwerkraftfilter)' : 'Linearer Beschleunigungssensor'}
              {(sensorMode==='height'?heightStatus:status)?.sensorName ? ` · ${(sensorMode==='height'?heightStatus:status).sensorName}` : ''}. Keine Berechtigung nötig.
            </p>
          : <p role="alert" style={{...noteStyle,margin:'6px 0',color:'var(--orange)'}}>
              {(sensorMode==='height'?heightStatus:status)?.reason} Bitte {sensorMode==='height'?'zum Bewegungssensor wechseln':'den Sensor prüfen'}.
            </p>}
      <button type="button" disabled={phase==='calibrating'||phase==='counting'||phase==='diagnosing'} onClick={checkSensor}
        style={{...action,padding:'8px 12px',marginTop:7}}>Sensor erneut prüfen</button>
    </div>
    <div style={{border:'1px solid var(--sep)',borderRadius:12,padding:12,margin:'10px 0'}}>
      <strong style={{fontSize:13}}>Sensor-Livetest · unabhängig vom Training</strong>
      <p className="muted small" style={noteStyle}>
        Funktioniert beim sicheren Halten in der Hand. Für den Test ist keine Befestigung erforderlich.
        Halte das Handy erst ruhig, hebe es dann etwa einen Meter hoch und wieder herunter.
      </p>
      {phase!=='diagnosing' && <button type="button" style={action} disabled={!available||phase==='calibrating'||phase==='counting'} onClick={startLiveTest}>Sensor live testen</button>}
      {phase==='diagnosing' && <>
        {sensorMode==='height'
          ? <div style={{fontVariantNumeric:'tabular-nums'}}>
              <div><strong>Höhenänderung:</strong> {live.heightCm === null ? 'Noch keine Daten' : live.heightCm.toFixed(1)+' cm'}</div>
              <div><strong>Maximaler Ausschlag:</strong> {live.maxCm.toFixed(1)} cm</div>
              <div><strong>Luftdruck:</strong> {live.pressureHpa === null ? 'Noch keine Daten' : live.pressureHpa.toFixed(4)+' hPa'}</div>
            </div>
          : <div><strong>Beschleunigung:</strong> {live.acceleration === null ? 'Noch keine Daten' : live.acceleration.toFixed(2)+' m/s²'}</div>}
        <div className="muted small">In der App empfangene Messwerte: {live.received} · Live-Test: {liveSeconds} s</div>
        {sensorMode==='height' && nativeHealth && <>
          <div className="muted small">Android-Sensorereignisse: {nativeHealth.nativeSamples} · Gesendet: {nativeHealth.emittedSamples} · Nullpunkt: {nativeHealth.baselineSamples}/8</div>
          {nativeHealth.error && <p role="alert" className="muted small">{nativeHealth.error}</p>}
          {liveSeconds >= 4 && nativeHealth.nativeSamples === 0 && <p role="alert" className="muted small">Der Sensor wird erkannt, liefert aber keine Rohdaten. Bitte Android-Sensoren prüfen und die App neu starten.</p>}
          {liveSeconds >= 4 && nativeHealth.nativeSamples > 8 && live.received === 0 && <p role="alert" className="muted small">Android misst Luftdruck, aber die Werte kommen nicht in der App an. Das ist ein Fehler in der Sensoranbindung.</p>}
        </>}
        {liveSeconds >= 4 && live.received > 0 && sensorMode==='height' && live.maxCm < 8 && <p className="muted small">Es kommen Daten an, aber bisher kaum Höhenänderung. Prüfe, ob du den Barometer-Livetest bei der Bewegung beobachtest.</p>}
        <button type="button" style={action} onClick={finishLiveTest}>Livetest stoppen</button>
      </>}
    </div>
    <div style={{border:'1px solid var(--sep)',background:'var(--surface)',borderRadius:16,padding:18,textAlign:'center',margin:'12px 0'}}>
      <div style={{fontSize:12,color:'var(--label-2)',fontWeight:650}}>{phase==='calibrating'?'KALIBRIERUNG · 3 WDH. (NOCH KEINE ZÄHLUNG)':phase==='counting'?'AUTOMATISCH GESCHÄTZT':'WIEDERHOLUNGEN'}</div>
      <div aria-live="polite" style={{fontSize:62,fontWeight:750,fontVariantNumeric:'tabular-nums'}}>{phase==='calibrating'?'–':count}</div>
      {tempo && <p className="muted small">Gelernter Rhythmus: etwa {tempo.toLocaleString('de-AT')} Sekunden pro Wiederholung</p>}
      {sensorMode==='height' && heightCm !== null && <p className="muted small" aria-live="off">Aktuelle relative Höhe: {heightCm} cm</p>}
      {sensorMode==='height' && amplitudeCm !== null && <p className="muted small">Kalibrierter Hub: etwa {amplitudeCm} cm</p>}
      {(phase==='calibrating'||phase==='counting') && <p className="muted small">Sensor-Messwerte: {frames}{frames===0 ? ' · Keine Daten empfangen' : ' · Sensor liefert Daten'}</p>}
    </div>
    {notice && <p role="status" style={{...noteStyle,color:'var(--label-2)'}}>{notice}</p>}
    {phase==='idle' && <div style={actions}><button style={accent} disabled={!secured || !available} onClick={startCalibration}>3 Wiederholungen kalibrieren</button><button style={action} onClick={cancel}>Abbrechen</button></div>}
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
