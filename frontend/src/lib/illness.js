// A self-reported break from training. This is a planning aid, NOT a medical clearance.
// Per-id stamped map; deletion writes a tombstone so sync does not resurrect the record.
const ISO=/^\d{4}-\d{2}-\d{2}$/
export function validDay(value) {
 if(typeof value!=='string'||!ISO.test(value))return false
 const d=new Date(value+'T12:00:00Z')
 return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value
}
export function nextDay(iso) {
 if(!validDay(iso))return null
 const d=new Date(iso+'T12:00:00Z')
 d.setUTCDate(d.getUTCDate()+1)
 return d.toISOString().slice(0,10)
}
const validMap=m=>!!m&&typeof m==='object'&&!Array.isArray(m)
export function cleanIllness(raw) {
 if(!validMap(raw)||!validDay(raw.start))return null
 if(raw.end && !validDay(raw.end))return null
 const end=validDay(raw.end)?raw.end:null
 if(end&&end<raw.start)return null
 if(raw.plannedReturn && !validDay(raw.plannedReturn))return null
 const plannedReturn=validDay(raw.plannedReturn)?raw.plannedReturn:null
 if(plannedReturn&&(!end||plannedReturn<=end))return null
 return {
  start:raw.start,end,plannedReturn,
  fatigueLevel:['mild','moderate','strong'].includes(raw.fatigueLevel)?raw.fatigueLevel:null,
  note:typeof raw.note==='string'?raw.note.trim().slice(0,300):'',
  // These are self-reported checkboxes, never a diagnosis or medical approval.
  feverFree:raw.feverFree===true, improving:raw.improving===true,
  noWarning:raw.noWarning===true, dailyEnergy:raw.dailyEnergy===true,
 }
}
export function illnessRecords(state){
 const map=validMap(state?.illnessPeriods)?state.illnessPeriods:{}
 return Object.entries(map).flatMap(([id,record])=>{
  const valid=cleanIllness(record)
  return valid?[{id,...valid,_ts:Number(record._ts)||0}]:[]
 }).sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id))
}
export function illnessOnDay(state,iso,today=iso) {
 if(!validDay(iso))return null
 return illnessRecords(state).filter(r=>r.start<=iso&&iso<=(r.end||today)).at(-1)||null
}
export function latestIllness(state,today) {
 return illnessRecords(state).filter(r=>r.start<=today).at(-1)||null
}
export function recoveryStatus(record,today) {
 const r=cleanIllness(record)
 if(!r||!validDay(today))return {state:'unknown',label:'Keine Angaben'}
 if(today<r.start)return {state:'upcoming',label:'Krankheitszeitraum geplant'}
 if(today>=r.start&&(!r.end||today<=r.end))return {state:'ill',label:'Krankheitszeitraum'}
 if(!r.end)return {state:'ill',label:'Krankheitszeitraum offen'}
 const checks=[r.feverFree,r.improving,r.noWarning,r.dailyEnergy].every(Boolean)
 if(!checks)return {state:'recovering',label:'Wiedereinstieg noch offen. Symptome und Belastbarkeit prüfen.'}
 if(!r.plannedReturn)return {state:'reassess',label:'Voraussetzungen selbst bestätigt. Trainingstermin noch nicht geplant.'}
 return {state:'planned',date:r.plannedReturn,label:'Geplanter leichter Wiedereinstieg ab '+r.plannedReturn}
}
export function putIllness(map,id,value,now=Date.now()){
 if(typeof id!=='string'||!id.trim())throw Error('Ungültige Eintrags-ID')
 const clean=cleanIllness(value)
 if(!clean)throw Error('Ungültiger Krankheitszeitraum oder Wiedereinstiegstermin')
 return {...(validMap(map)?map:{}),[id]:{...clean,_ts:now}}
}
export function clearIllness(map,id,now=Date.now()) {
 if(typeof id!=='string'||!id.trim())throw Error('Ungültige Eintrags-ID')
 return {...(validMap(map)?map:{}),[id]:{_ts:now}}
}
