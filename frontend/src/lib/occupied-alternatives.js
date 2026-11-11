// Conservative equipment-independent suggestions; never claim clinical equivalence.
const pattern = name => {
 const n=String(name||'').toLowerCase()
 if(/squat|press.*leg|leg press|hack squat|lunge|split squat/.test(n))return 'knee'
 if(/deadlift|rdl|hip thrust|good morning|glute bridge/.test(n))return 'hip'
 if(/row|rudern/.test(n))return 'row'
 if(/pull.?up|chin.?up|pulldown|latzug/.test(n))return 'vertical-pull'
 if(/bench press|chest press|push.?up|brustpress/.test(n))return 'horizontal-push'
 if(/shoulder press|overhead press/.test(n))return 'vertical-push'
 if(/curl/.test(n))return 'curl'
 if(/extension|pushdown/.test(n))return 'extension'
 if(/raise|heben/.test(n))return 'raise'
 return ''
}
export function occupiedAlternatives(current, catalogue, inSession = [], limit = 5) {
 if(!current?.id || !current.tg)return []
 const currentPattern=pattern(current.n)
 const used=new Set(inSession)
 const candidates=(catalogue||[]).filter(ex=>ex?.id!==current.id&&!used.has(ex.id)&&ex.tg===current.tg&&ex.bp===current.bp&&(ex.cat||'strength')===(current.cat||'strength'))
 return candidates.map(ex=>{
   const samePattern=!!currentPattern&&pattern(ex.n)===currentPattern
   const differentEquipment=ex.eq!==current.eq
   const score=(samePattern?20:0)+(differentEquipment?8:0)+(ex.eq?2:0)
   return {ex,score,reason:samePattern?'Ähnliches Bewegungsmuster': 'Gleicher Zielmuskel – Bewegung prüfen'}
 }).sort((a,b)=>b.score-a.score||String(a.ex.n).localeCompare(String(b.ex.n))).slice(0,Math.max(0,Math.min(limit,10)))
}
