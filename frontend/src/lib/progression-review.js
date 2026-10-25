// Non-destructive UI review of the existing progression engine's planned session.
// No write to workout history, saved routines or nutrition data.
import { isWarmupRow, isSideSet, isDropSet, isRestPauseSet } from './workout-model.js'

const numeric = v => v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null
export const needsProgressionReview = entry =>
  !!entry && !entry.noProg && ['up', 'deload'].includes(entry.plan?.kind) &&
  entry.plan?.reviewDecision == null && Array.isArray(entry.sets) &&
  entry.sets.some(s => !isWarmupRow(s) && !s.done)

// Taking the suggested prescription is explicit and changes no work-set data.
export function acceptProgression(entry) {
  if (!needsProgressionReview(entry)) return null
  return { ...entry, plan: { ...entry.plan, reviewDecision: 'accepted' } }
}

// "Keep last session" is only offered when the last workout has the same simple,
// straight work-set shape and no current set was already logged or edited.
// In every other case the user can still change the fields manually.
export function canHoldPrevious(entry, previous) {
  if (!needsProgressionReview(entry) || !previous?.sets) return false
  const rows = entry.sets || []
  const work = rows.filter(s => !isWarmupRow(s))
  if (rows.length !== work.length || work.length !== previous.sets.length || !work.length) return false
  if (work.some(s => s.done || isSideSet(s) || isDropSet(s) || isRestPauseSet(s) ||
     numeric(s.w) === null || numeric(s.r) === null)) return false
  return previous.sets.every(s => s.done && !isSideSet(s) && !isWarmupRow(s) &&
    !isDropSet(s) && !isRestPauseSet(s) && numeric(s.w) !== null && numeric(s.r) !== null)
}
export function holdPreviousProgression(entry, previous) {
  if (!canHoldPrevious(entry, previous)) return null
  const sets = entry.sets.map((s,i) => ({
    ...s, w: numeric(previous.sets[i].w), r: numeric(previous.sets[i].r),
  }))
  return {
    ...entry, sets,
    target: { ...entry.target,
      weight: numeric(previous.sets[0].w),
      reps: numeric(previous.target?.reps) ?? Math.max(...previous.sets.map(s => numeric(s.r))),
      sets: sets.length,
    },
    plan: { ...entry.plan, reviewDecision: 'held',
      reviewNote: 'Werte der letzten Einheit übernommen' },
  }
}
