import { useEffect, useState } from 'react'
import { isCustomEx } from '../lib/exercises.js'
import REPDB_IMAGE_MAP from '../lib/repdb-image-map.json'
import { MOBILE } from '../lib/mobile.js'
import { useStore } from '../store/useStore.js'
import { t, exerciseNameFor } from '../lib/i18n.js'
import Icon from './Icon.jsx'
import CustomMedia, { CustomThumb } from './CustomMedia.jsx'
import { getPrivateExerciseImage, subscribePrivateExerciseImages } from '../lib/private-exercise-images.js'


// Reads the device-only override; never sends it to a remote service.
export function usePrivateExerciseImage(id) {
  const [url,setUrl]=useState(null)
  const [revision,setRevision]=useState(0)
  useEffect(()=>subscribePrivateExerciseImages(()=>setRevision(n=>n+1)),[])
  useEffect(()=>{
    let active=true,objectUrl=null
    getPrivateExerciseImage(id).then(blob=>{
      if(blob&&active){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl)}
      else if(active)setUrl(null)
    }).catch(()=>{if(active)setUrl(null)})
    return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}
  },[id,revision])
  return url
}

// An exercise's picture, wherever one shows. A custom exercise goes to CustomMedia.jsx — its own
// photo, GIF, video or link, from the local media store — and never through imgSrc/gifSrc, which
// name files of the shipped dataset (a stray img/gif on a custom exercise, written by a fork, is
// ignored). The split is by component, not by branch, so each side keeps its own hooks in order.
export default function Media(p) {
  return <ExerciseMediaWithOverride {...p} />
}

// One override path for BOTH catalogue and custom exercises.
// CustomMedia previously bypassed the private image store entirely.
function ExerciseMediaWithOverride(p) {
  const privateUrl = usePrivateExerciseImage(p.ex?.id)
  if (privateUrl) {
    return <div className={'exmedia' + (p.compact ? ' compact' : '')} id={p.id}>
      <img src={privateUrl} alt={exerciseNameFor(p.ex)} decoding="async"
        style={{objectFit:'contain',width:'100%',height:'100%'}} />
    </div>
  }
  return isCustomEx(p.ex) ? <CustomMedia {...p} /> : <BuiltinMedia {...p} />
}

// Big autoplaying animation; tap toggles to the still frame. `compact` shrinks it (superset cards).
// `minimizable` (workout view) adds a persistent minimize/expand control so the animation stops
// eating the screen; the chosen size is saved to settings and carries across exercises and
// future workouts (issue #12). Settings can also turn workout media off entirely
// (gifSize 'off') — then nothing renders here and the exercise card closes up, exactly like
// an exercise without media. Any other/legacy value behaves as 'full'.
// Built-in exercises no longer use the outdated openGym GIF/MP4 paths.
// RepDB is the only bundled illustration fallback; users can override it locally.
function BuiltinMedia({ ex, id, compact, minimizable }) {
  const gifSize = useStore(s => s.S.gifSize)
  const src = REPDB_IMAGE_MAP[ex?.id] ? 'exercise-media/repdb/' + REPDB_IMAGE_MAP[ex.id] : null
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (minimizable && (gifSize === 'off' || !src)) return null
  const mini = minimizable && gifSize === 'mini'
  if (!src || failed) return minimizable ? null : <div className="exmedia broken" id={id}>
    <div className="exmedia-x" role="status"><Icon name="image" /><span>Kein Übungsbild vorhanden. Unten eigenes Bild hinzufügen.</span></div>
  </div>
  return <div className={'exmedia' + (compact ? ' compact' : '') + (mini ? ' mini' : '')} id={id}>
    <img src={src} decoding="async" alt={exerciseNameFor(ex)} onError={() => setFailed(true)} />
  </div>
}

// In the phone app the clips come out of the app package through Capacitor's local server, which
// answers every seek with a fresh, slow read: each loop jumped back to 0 and sat there for one to
// five seconds, and users saw "slow and buggy" animations (the web, with its HTTP cache, never
// did). So the app reads a clip into memory once (20-40 KB) and plays it from there; the last few
// stay, so reopening an exercise is instant. The web keeps its URL and the browser's cache.
const MEMORY_CLIPS = 30
const clipCache = new Map()          // src -> object URL, oldest first
const clipLoads = new Map()          // src -> pending promise
function loadClip(src) {
  if (clipCache.has(src)) {
    const url = clipCache.get(src)
    clipCache.delete(src); clipCache.set(src, url)   // most recently used last
    return Promise.resolve(url)
  }
  if (!clipLoads.has(src)) {
    clipLoads.set(src, fetch(src)
      .then(r => (r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(blob => {
        const url = URL.createObjectURL(blob)
        clipCache.set(src, url)
        while (clipCache.size > MEMORY_CLIPS) {
          const [old, oldUrl] = clipCache.entries().next().value
          clipCache.delete(old); URL.revokeObjectURL(oldUrl)
        }
        return url
      })
      .finally(() => clipLoads.delete(src)))
  }
  return clipLoads.get(src)
}

export function useClipInMemory(src, inApp = MOBILE) {
  const [url, setUrl] = useState(() => (src && inApp ? clipCache.get(src) || null : src))
  useEffect(() => {
    if (!src || !inApp) { setUrl(src); return }
    let alive = true
    setUrl(clipCache.get(src) || null)
    // A read that fails falls back to the URL itself: playing slowly beats not playing.
    loadClip(src).then(u => { if (alive) setUrl(u) }, () => { if (alive) setUrl(src) })
    return () => { alive = false }
  }, [src, inApp])
  return url
}

// React sets `muted` as a property only, never as the attribute, and Android's WebView (the phone
// app) allows autoplay only for a video that carries the attribute: the loop sat on its first frame
// there while every desktop browser played it. Set it before the first frame and start playback
// ourselves; a refusal leaves the still showing, which a tap can still start.
export function autoplayMuted(el) {
  if (!el) return
  el.muted = true
  el.defaultMuted = true
  el.setAttribute('muted', '')
  const p = el.play?.()
  if (p && typeof p.catch === 'function') p.catch(() => {})
}

// A still that will not load (offline and never cached, a lapsed session on a gated instance, a
// CDN hiccup) gets the same neutral tile as an exercise without media, instead of the browser's
// broken-image glyph in a list of them (#281). The failure is remembered per image, so a list
// that re-renders does not ask again; a new exercise in the same slot tries its own.
export function Thumb(p) {
  return <ExerciseThumbWithOverride {...p} />
}
function ExerciseThumbWithOverride(p) {
  const privateUrl = usePrivateExerciseImage(p.ex?.id)
  if (privateUrl) return <img className="thumb" loading="lazy" decoding="async" draggable={false} src={privateUrl} alt="" />
  return isCustomEx(p.ex) ? <CustomThumb {...p} /> : <BuiltinThumb {...p} />
}
function BuiltinThumb({ ex }) {
  const src = REPDB_IMAGE_MAP[ex?.id] ? 'exercise-media/repdb/' + REPDB_IMAGE_MAP[ex.id] : null
  const [broken, setBroken] = useState(null)
  if (!src || broken === src) return <div className="thumb thumb-x"><Icon name="dumbbell" /></div>
  return <img className="thumb" loading="lazy" decoding="async" draggable={false} src={src} alt="" onError={() => setBroken(src)} />
}
