// Approximate workout energy, never a measured value. The training log stores duration
// and completed sets but no calorimetry; estimates must never inflate the food budget.
import { workoutDay, workoutDuration } from './history.js'
import { hasCompletedWork, modeForEntry } from './workout-model.js'

const LB_PER_KG = 2.2046226218
const validWeight = (weight, unit) => {
  const kg = Number(weight) / (unit === 'lb' ? LB_PER_KG : 1)
  return Number.isFinite(kg) && kg >= 25 && kg <= 300 ? kg : null
}

export function workoutEnergyEstimate(workout, weight, unit = 'kg') {
  const kg = validWeight(workout?.bw ?? weight, unit)
  const mins = workoutDuration(workout) / 60000
  // Reject accidentally forgotten long sessions or unlogged workout durations.
  if (!kg || !(mins >= 5 && mins <= 240)) return null
  const completed = (Array.isArray(workout?.entries) ? workout.entries : [])
    .filter(e => (e.sets || []).some(hasCompletedWork))
  if (!completed.length) return null
  const strength = completed.some(e => modeForEntry(e) !== 'cardio')
  // Coarse MET for a whole session including pauses, not calories per set.
  const met = strength ? 3.5 : 5.0
  return {
    id: workout.id,
    name: workout.name || (strength ? 'Krafttraining' : 'Cardio'),
    kcal: Math.round(met * 3.5 * kg * mins / 200),
    minutes: Math.round(mins),
  }
}

export function trainingEnergyForDay(workouts, date, weight, unit = 'kg') {
  const sessions = (Array.isArray(workouts) ? workouts : [])
    .filter(w => workoutDay(w) === date)
    .map(w => workoutEnergyEstimate(w, weight, unit))
    .filter(Boolean)
  return { sessions, kcal: sessions.reduce((total, w) => total + w.kcal, 0) }
}
