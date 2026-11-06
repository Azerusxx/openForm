import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { effectiveRoutineIds, effectiveRoutines } from '../lib/history.js'
import { todayISO } from '../lib/format.js'
import { t } from '../lib/i18n.js'
import { bwSheet, customExSheet } from '../sheets.jsx'
import Icon from './Icon.jsx'
import { useConnectionTrouble } from './SyncBanner.jsx'

const nutritionPath = action => '/nutrition' + (action ? '?create=' + encodeURIComponent(action) : '')
const top = () => window.scrollTo({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })

function Tab({ active, icon, label, onClick, dot }) {
  return <button type="button" className={active ? 'on' : ''} aria-current={active ? 'page' : undefined}
    onClick={onClick} aria-label={dot ? label + ', ' + t('Connection problem') : label}>
    <span className="tab-ic"><Icon name={icon} />{dot && <span className="tab-dot" aria-hidden="true" />}</span><span>{label}</span>
  </button>
}

export default function TabBar({ onStart }) {
  const nav = useNavigate()
  const loc = useLocation()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const isGuest = useStore(s => s.isGuest())
  const trouble = useConnectionTrouble()
  const [createOpen,setCreateOpen] = useState(false)
  useEffect(()=>setCreateOpen(false),[loc.pathname,loc.search])
  useEffect(()=>{
    if(!createOpen) return
    const onKey = e=>{if(e.key==='Escape')setCreateOpen(false)}
    const onBack = e => { e.preventDefault(); setCreateOpen(false) }
    document.addEventListener('keydown',onKey)
    window.addEventListener('openform-close-overlay',onBack)
    return ()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('openform-close-overlay',onBack)}
  },[createOpen])
  if (!user && !isGuest) return null
  const cur = loc.pathname.split('/')[1] || 'home'
  const active = {
    home: ['home','stats','history','structural-balance','progress-photos','measurements'].includes(cur),
    nutrition: cur === 'nutrition',
    plan: ['plan','library','muscles','workout','checkin'].includes(cur),
    settings: ['settings','coach'].includes(cur),
  }
  const activeIndex = active.home ? 0 : active.nutrition ? 1 : active.plan ? 3 : active.settings ? 4 : -1
  const go = path => {
    if (loc.pathname === path && !loc.search) { top(); return }
    nav(path)
  }
  const startWorkout = () => {
    setCreateOpen(false)
    if (!S.active && effectiveRoutines(S, todayISO()).some(r => r.ex.length)) {
      onStart(effectiveRoutineIds(S, todayISO()))
    } else nav('/workout')
  }
  const launch = (action) => {
    setCreateOpen(false)
    if(action==='workout'){startWorkout();return}
    if(action==='weight'){bwSheet();return}
    if(action==='exercise'){customExSheet(null);return}
    nav(nutritionPath(action))
  }
  return <>
    {createOpen && <div className="of-create-overlay" onClick={()=>setCreateOpen(false)}>
      <section className="of-create-sheet" role="dialog" aria-modal="true" aria-label="Erstellen" onClick={e=>e.stopPropagation()}>
        <div className="of-create-head"><strong>Was möchtest du erstellen?</strong><button type="button" onClick={()=>setCreateOpen(false)} aria-label="Schließen"><Icon name="xmark" /></button></div>
        <div className="of-create-actions">
          <button onClick={()=>launch('food')}><Icon name="plate" />Essen erfassen</button>
          <button onClick={()=>launch('workout')}><Icon name="dumbbell" />Training starten</button>
          <button onClick={()=>launch('recipe')}><Icon name="book" />Rezept erstellen</button>
          <button onClick={()=>launch('weight')}><Icon name="chart" />Gewicht eintragen</button>
          <button onClick={()=>launch('water')}><Icon name="droplet" />Wasser erfassen</button>
          <button onClick={()=>launch('exercise')}><Icon name="plus" />Übung erstellen</button>
        </div>
      </section>
    </div>}
    <nav id="tabbar" data-floating-glass data-has-active={activeIndex >= 0 ? 'true' : 'false'}
      style={{ '--of-active-index': Math.max(0,activeIndex) }} aria-label="Hauptnavigation">
      <Tab active={active.home} icon="house" label="Start" dot={trouble} onClick={()=>go('/home')} />
      <Tab active={active.nutrition} icon="plate" label="Essen" onClick={()=>go('/nutrition')} />
      <button type="button" className={'of-create-trigger' + (createOpen ? ' on' : '')}
        aria-label={createOpen ? 'Erstellen schließen' : 'Erstellen'} aria-expanded={createOpen} onClick={()=>setCreateOpen(x=>!x)}>
        <span className="cir"><Icon name={createOpen ? 'xmark' : 'plus'} /></span><span>Erstellen</span>
      </button>
      <Tab active={active.plan} icon="dumbbell" label="Training" onClick={()=>go('/plan')} />
      <Tab active={active.settings} icon="person" label="Profil" onClick={()=>go('/settings')} />
    </nav>
  </>
}
