// Conservative cross-catalogue matching for openGym exercise IDs and RepDB stills.
// Never infer a movement from muscle alone; preserve grip, implement and body position.
const clean = value => String(value ?? '').toLowerCase().normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g,' ')

export function equipmentFamily(value) {
  const s = clean(value)
  if (!s) return ''
  if (/\bsmith\b/.test(s)) return 'smith'
  if (/\bcable\b|\bpulley\b/.test(s)) return 'cable'
  if (/\bdumbbell\b/.test(s)) return 'dumbbell'
  if (/\bkettlebell\b/.test(s)) return 'kettlebell'
  if (/\bbarbell\b|\bez bar\b|\bolympic bar\b/.test(s)) return 'barbell'
  if (/\bresistance band\b|\bband\b/.test(s)) return 'band'
  if (/\bbody weight\b|\bbodyweight\b|\bno equipment\b|\bnone\b/.test(s)) return 'bodyweight'
  if (/\bmachine\b|\bleverage\b|\bsled\b|\blever\b/.test(s)) return 'machine'
  return s
}
const tokens = str => clean(str).split(' ').filter(Boolean).map(t=>
  ({triceps:'tricep',biceps:'bicep',pressdown:'pushdown',pulldowns:'pulldown',
    presses:'press',extensions:'extension',curls:'curl',rows:'row',raises:'raise',
    dumbbells:'dumbbell',machines:'machine',levers:'lever'}[t]||t))
const neutralTokens = new Set(['the','on','using','with','exercise'])
const makeTokens=(name,equipment)=>tokens(name).filter(t=>{
  if(neutralTokens.has(t)) return false
  // Equipment is checked separately. Drop equipment words ONLY once their
  // respective families have been matched.
  if(equipment==='machine' && ['machine','lever','leverage'].includes(t)) return false
  if(equipment==='cable' && ['cable','pulley','machine'].includes(t)) return false
  if(equipment==='smith' && ['smith','machine'].includes(t)) return false
  if(equipment==='dumbbell' && t==='dumbbell') return false
  if(equipment==='barbell' && ['barbell','ez','olympic'].includes(t)) return false
  if(equipment==='bodyweight' && ['bodyweight'].includes(t)) return false
  if(equipment==='kettlebell' && t==='kettlebell') return false
  return true
})
const sensitiveGroups = [
  ['incline','decline','flat'],
  ['seated','standing','lying','prone','supine'],
  ['wide','close','neutral','underhand','overhand'],
  ['assisted','weighted'],['single','one','two','alternating'],
  ['reverse','front','side','lateral','rear'],
]
const sameVariant=(a,b)=>{
  const A=new Set(a),B=new Set(b)
  // If either side explicitly states a sensitive variant, the other must
  // carry it as well; a generic illustration must not stand in for a variant.
  return sensitiveGroups.every(g=>g.filter(v=>A.has(v)).sort().join('|')===g.filter(v=>B.has(v)).sort().join('|'))
}
const sorted = x=>[...x].sort().join(' ')

export function matchRepdbExercise(exercise, entries) {
  const family=equipmentFamily(exercise?.eq)
  if(!family || !exercise?.n) return {kind:'none',candidates:[]}
  const our=makeTokens(exercise.n,family)
  if(!our.length) return {kind:'none',candidates:[]}
  const ourKey=sorted(our)
  const possibilities=[]
  for(const entry of entries||[]) {
    const theirs=equipmentFamily(entry.equipment)
    if(theirs !== family) continue
    let score=0,matchedName=''
    for(const name of [entry.name_en,entry.name_de]){
      if(!name)continue
      const other=makeTokens(name,family)
      if(!other.length||!sameVariant(our,other))continue
      const key=sorted(other)
      if(key===ourKey){score=100;matchedName=name;break}
      // Conservative high-overlap candidate, returned for human review only.
      const A=new Set(our),B=new Set(other)
      const common=[...A].filter(t=>B.has(t)).length
      const similarity=common/Math.max(1,A.size+B.size-common)
      if(similarity>=.8 && similarity*100>score){score=Math.round(similarity*100);matchedName=name}
    }
    if(score>0)possibilities.push({entry,score,name:matchedName})
  }
  possibilities.sort((a,b)=>b.score-a.score||String(a.entry.id).localeCompare(String(b.entry.id)))
  const perfect=possibilities.filter(p=>p.score===100)
  if(perfect.length===1) return {kind:'exact',entry:perfect[0].entry,candidates:possibilities.slice(0,3)}
  // Multiple perfect variants are ambiguous, not free matches.
  return {kind:possibilities.length?'review':'none',candidates:possibilities.slice(0,3)}
}
