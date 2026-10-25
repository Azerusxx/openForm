// Self-reported illness is an *independent* general training-readiness constraint.
// It must never be converted into effective hard sets or injected into fatigueOf().
import { illnessOnDay, illnessRecords, latestIllness, validDay } from './illness.js'
import { dayNoteOf } from './day-notes.js'

const DAY_MS=86400000
const dayMs=iso=>Date.parse(iso+'T12:00:00Z')
const daysBetween=(from,to)=>Math.round((dayMs(to)-dayMs(from))/DAY_MS)
const previousDay=(today,diff)=>{
  const d=new Date(dayMs(today)-diff*DAY_MS)
  return d.toISOString().slice(0,10)
}
export const ILLNESS_FATIGUE_LABELS=Object.freeze({
  mild:'Leicht',moderate:'Mittel',strong:'Stark',
})
export function illnessBurdenStats(S,today,windowDays=30){
  if(!validDay(today))return {state:'none',sickDays:0,level:null,record:null,message:''}
  const span=Math.max(1,Math.min(366,Math.trunc(Number(windowDays)||30)))
  let sickDays=0
  for(let d=0;d<span;d++){
    const iso=previousDay(today,d)
    if(illnessOnDay(S,iso,today)||dayNoteOf(S,iso)?.tag==='sick')sickDays++
  }
  const active=illnessOnDay(S,today,today)
  const last=latestIllness(S,today)
  const legacyToday=dayNoteOf(S,today)?.tag==='sick'
  if(active||legacyToday){
    const level=active?.fatigueLevel||null
    return {state:'ill',sickDays,level,record:active||null,
      label:'Krankheitsbedingte Belastung',
      message:level
        ? 'Krank gemeldet · Erschöpfung: '+ILLNESS_FATIGUE_LABELS[level]+'. Trainingsbelastbarkeit derzeit eingeschränkt.'
        : 'Krank gemeldet. Trainingsbelastbarkeit derzeit eingeschränkt; Erschöpfung nicht eingeschätzt.',
      recommendation:'Training pausieren und Erholung priorisieren. Bei Warnzeichen ärztlich abklären.',
    }
  }
  // A recent, explicitly ended period is shown in statistics for at most 14 days.
  // That horizon is a UI visibility choice, NOT a biological recovery timeline.
  if(last?.end&&last.end<today&&daysBetween(last.end,today)<=14){
    const confirmed=[last.feverFree,last.improving,last.noWarning,last.dailyEnergy].every(Boolean)
    return {
      state:confirmed?'return':'recovering',sickDays,level:last.fatigueLevel||null,
      record:last,label:'Wiedereinstieg nach Krankheit',
      message:confirmed
        ? 'Erholungsvoraussetzungen selbst bestätigt. Mit leichter Belastung beginnen, nicht automatisch volle Trainingsbereitschaft annehmen.'
        : 'Erholung noch nicht bestätigt. Die Trainingsbereitschaft bleibt vorsichtig eingeschätzt.',
      recommendation:'Muskelermüdung und allgemeine Belastbarkeit getrennt betrachten. Bei Symptomen nicht trainieren.',
    }
  }
  return {state:'none',sickDays,level:null,record:null,message:''}
}
