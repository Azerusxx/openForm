// Optional smart rest recommendations for openForm 0.3.7a.
// Pure logic: never mutates workouts, exercise targets, or an active timer.
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))
export function suggestRestSeconds({ exercise = '', previousSeconds = 90, intensity = null, compound = false, reps = null, userSeconds = null } = {}) {
  const explicit = Number(userSeconds)
  if (userSeconds != null && Number.isFinite(explicit) && explicit > 0) return { seconds: explicit, reason: 'Eigene Pausenzeit', source: 'manual' }
  const name = String(exercise).toLocaleLowerCase('de')
  const heavy = compound || /kniebeuge|beinpresse|kreuzheben|bankdrücken|bankdruecken|rudern|latzug|schulterdrücken|schulterdruecken|squat|deadlift|bench press|leg press/.test(name)
  let seconds = heavy ? 150 : 90
  if (Number.isFinite(Number(reps)) && reps !== null && Number(reps) <= 5) seconds += 30
  if (Number.isFinite(Number(intensity)) && intensity !== null && Number(intensity) >= 9) seconds += 30
  seconds = clamp(seconds, 45, 240)
  const fallback = Number(previousSeconds)
  if (!name && !compound && reps == null && intensity == null && Number.isFinite(fallback) && fallback > 0) {
    return { seconds: fallback, reason: 'Bisherige Standardpause', source: 'default' }
  }
  return { seconds, reason: heavy ? 'Mehrgelenkige Übung / hohe Belastung' : 'Übung mit moderater Belastung', source: 'suggested' }
}
