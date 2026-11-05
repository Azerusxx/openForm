// Local-only supplement reminders. Scheduling never modifies consumption logs.
import { MOBILE } from './mobile.js'

export const SUPPLEMENT_REMINDER_DAYS = 14
const BASE = 30000
const LIMIT = 100
export function buildSupplementNotifications(supplements, now = new Date()) {
  const active = (supplements || []).filter(s => s.reminderEnabled && /^([01]\d|2[0-3]):[0-5]\d$/.test(s.reminderTime || '')).slice(0, LIMIT)
  const notes = []
  const date = new Date(now.getFullYear(),now.getMonth(),now.getDate(),12)
  for(let day=0;day<SUPPLEMENT_REMINDER_DAYS;day++) {
    const d = new Date(date)
    d.setDate(d.getDate()+day)
    const key = [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')
    const byTime = new Map()
    for(const s of active) {
      if ((s.logs || []).includes(key)) continue
      const names = byTime.get(s.reminderTime) || []
      names.push(s.name)
      byTime.set(s.reminderTime,names)
    }
    let slot=0
    for(const [time,names] of [...byTime.entries()].sort(([a],[b])=>a.localeCompare(b))) {
      const when = new Date(d)
      const [h,m]=time.split(':').map(Number)
      when.setHours(h,m,0,0)
      if(when<=now) continue
      notes.push({id:BASE+day*LIMIT+slot++,title:'openForm · Supplements',
        body:names.length===1 ? names[0]+' steht noch aus.' : names.join(', ')+' stehen noch aus.',
        schedule:{at:when,allowWhileIdle:true}})
    }
  }
  return notes
}
// Multiple app-resume and nutrition-save events can arrive together.
// Serialize cancel + schedule so an older job cannot wipe newer reminders.
let syncQueue = Promise.resolve()
export function syncSupplementReminders(supplements,interactive=false) {
  syncQueue = syncQueue.catch(()=>false).then(()=>performSupplementSync(supplements,interactive))
  return syncQueue
}
async function performSupplementSync(supplements,interactive=false) {
  if(!MOBILE) return false
  try {
    const {LocalNotifications} = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    const ours = (pending.notifications||[]).filter(n=>n.id>=BASE && n.id<BASE+SUPPLEMENT_REMINDER_DAYS*LIMIT)
    if(ours.length) await LocalNotifications.cancel({notifications:ours.map(n=>({id:n.id}))})
    const notifications=buildSupplementNotifications(supplements)
    if(!notifications.length) return true
    let p=await LocalNotifications.checkPermissions()
    if(p.display!=='granted' && interactive) p=await LocalNotifications.requestPermissions()
    if(p.display!=='granted') return false
    await LocalNotifications.schedule({notifications})
    return true
  } catch { return false }
}
