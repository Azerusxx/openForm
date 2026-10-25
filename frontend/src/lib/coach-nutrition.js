// Local, deterministic nutrition + training observations. No cloud keys or provider credits.
// This does NOT pretend to be a generative AI response; all numbers come from local logs.
import { dateLocal, dayTotals, normalizedNutrition } from './nutrition.js'
import { weeklyNutrition } from './nutrition-extra.js'
export const nutritionQuestion = text => /(essen|ernährung|ernaehrung|kalorien|kcal|protein|eiweiß|eiweiss|kohlenhydrat|fett|supplement|kreatin|magnesium|mahlzeit|diät|diaet|wasser|mikronährstoff|vitamin|nutrition|food|macros?)/i.test(String(text || ''))
export function coachNutritionReport(raw, state, today = dateLocal()) {
  const data = normalizedNutrition(raw)
  const day = dayTotals(data.entries, today)
  const week = weeklyNutrition(data.entries, today, data.goals)
  const rounded = v => Math.round(Number(v) || 0)
  const lines = ['Ernährungsbilanz aus deinen lokalen Einträgen (ohne externe KI):']
  const count = data.entries.filter(e => e.date === today).length
  if (!count) lines.push('Heute sind noch keine Mahlzeiten erfasst. 0 kcal im Protokoll bedeutet nicht, dass du nichts gegessen hast.')
  else {
    lines.push(`Heute: ${rounded(day.kcal)} von ${rounded(data.goals.kcal)} kcal und ${rounded(day.protein)} von ${rounded(data.goals.protein)} g Protein (${count} Einträge).`)
    const diff = rounded(data.goals.protein - day.protein)
    if (diff > 0) lines.push(`Zum Proteinziel fehlen nach deinen Einträgen ${diff} g.`)
    else lines.push('Das dokumentierte Proteinziel ist erreicht.')
  }
  if (week.daysLogged) lines.push(`Letzte 7 Tage: ${week.daysLogged} protokollierte Tage, Ø ${rounded(week.average.kcal)} kcal und Ø ${rounded(week.average.protein)} g Protein pro erfasstem Tag. Leere Tage sind nicht berücksichtigt.`)
  else lines.push('Noch kein aussagekräftiger 7-Tage-Ernährungstrend vorhanden.')
  const supps = data.supplements || []
  if (supps.length) lines.push(`Supplements heute: ${supps.filter(s => s.logs.includes(today)).length} von ${supps.length} als eingenommen markiert. Nährstoffgehalte werden ohne Produktdaten nicht eingerechnet.`)
  const workouts = Array.isArray(state?.workouts) ? state.workouts.length : 0
  if (workouts) lines.push(`${workouts} Trainings im Verlauf. Belastung und Kalorienbedarf sind nicht automatisch gleichzusetzen; Trainingskalorien werden hier nicht geschätzt.`)
  lines.push('Das ist eine Datenauswertung, keine medizinische Beratung oder KI-Diagnose. Für eine echte Einschätzung des Kaloriendefizits fehlen individuelle Verbrauchsdaten.')
  return lines.join('\n\n')
}
