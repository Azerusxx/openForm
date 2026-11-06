import { useEffect, useRef, useState } from 'react'

// Vertical pull-to-refresh for read-only overview pages, never during editing or a workout.
// Does not block native scrolling or Android's horizontal edge-back gesture.
export function usePullRefresh(onRefresh, enabled = true) {
  const latest = useRef(onRefresh)
  latest.current = onRefresh
  const [refreshing,setRefreshing] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let start=null, working=false
    const touchStart = e => {
      if (working || window.scrollY > 2 || e.touches.length !== 1 ||
          e.target?.closest?.('input,textarea,select,button,[role="dialog"]')) { start=null; return }
      const t=e.touches[0]
      start={x:t.clientX,y:t.clientY}
    }
    const touchEnd = e => {
      if (!start || working || !e.changedTouches.length) return
      const t=e.changedTouches[0],dx=t.clientX-start.x,dy=t.clientY-start.y
      start=null
      if (dy<90 || dy<Math.abs(dx)*1.7 || window.scrollY>2) return
      working=true
      setRefreshing(true)
      Promise.resolve().then(()=>latest.current?.()).catch(()=>{}).finally(()=>{
        working=false
        setRefreshing(false)
      })
    }
    const cancel=()=>{start=null}
    window.addEventListener('touchstart',touchStart,{passive:true})
    window.addEventListener('touchend',touchEnd,{passive:true})
    window.addEventListener('touchcancel',cancel,{passive:true})
    return ()=>{
      window.removeEventListener('touchstart',touchStart)
      window.removeEventListener('touchend',touchEnd)
      window.removeEventListener('touchcancel',cancel)
    }
  },[enabled])
  return refreshing
}
