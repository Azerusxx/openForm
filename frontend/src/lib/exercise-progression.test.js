import { describe, it, expect } from 'vitest'
import { exerciseSessionsFor, nextPrescription } from './progression.js'
import { EXDB, isAssisted } from './exercises.js'

const LIFT = EXDB.find(e => e.bp !== 'cardio' &&
  !['upper legs', 'lower legs', 'back', 'hips', 'glutes'].includes(e.bp) &&
  !['body weight', 'band', 'resistance band'].includes(e.eq) &&
  !isAssisted(e.id)).id
const cfg = { id: LIFT, sets: 2, reps: 10, weight: 60, prog: 'linear' }
const routine = id => ({ id, ex: [] })
const logged = (rid, d, { weight = 60, reps = 10, targetReps = 10, planWeight = weight } = {}) => ({
  d, routineIds: [rid],
  entries: [{
    id: LIFT, rid,
    planned: { sets: 2, reps: targetReps, weight: planWeight },
    target: { sets: 2, reps: targetReps, weight },
    sets: Array.from({ length: 2 }, () => ({ w: weight, r: reps, done: true }))
  }]
})
const state = workouts => ({ unit: 'kg', progressionScope: 'exercise', workouts })

describe('0.3.8 progression per exercise, not per training plan', () => {
  it('continues from last compatible session even when it was in another routine', () => {
    const S = state([
      logged('fullbody-a', '2026-10-01'),
      logged('push', '2026-10-08', { weight: 62.5, planWeight: 60 })
    ])
    expect(exerciseSessionsFor(S, LIFT, cfg, 'fullbody-a').map(s => s.rid))
      .toEqual(['fullbody-a', 'push'])
    expect(nextPrescription(S, cfg, routine('fullbody-a')))
      .toMatchObject({ kind: 'up', weight: 65 })
  })

  it('does not automatically increase load after a long exercise break', () => {
    const S = state([logged('leg-day', '2026-01-05')])
    const plan = nextPrescription(S, cfg, routine('leg-day'))
    expect(plan).toMatchObject({ kind: 'hold', weight: 60 })
    expect(plan.why[0]).toContain('days ago')
  })

  it('uses matching historical targets even when planned snapshots are absent', () => {
    const past = logged('fullbody', '2026-10-17')
    delete past.entries[0].planned
    const S = state([past])
    expect(exerciseSessionsFor(S, LIFT, cfg, 'push').map(s => s.rid)).toEqual(['fullbody'])
    expect(nextPrescription(S, cfg, routine('push')))
      .toMatchObject({ kind: 'up', weight: 62.5 })
  })

  it('does not borrow an incompatible legacy rep target', () => {
    const past = logged('light', '2026-10-17', { weight: 40, reps: 15, targetReps: 15 })
    delete past.entries[0].planned
    const S = state([past])
    expect(nextPrescription(S, cfg, routine('heavy'))).toMatchObject({ kind: 'hold', weight: 60, reps: 10 })
  })

  it('does not mix a 15-rep light day with a 10-rep heavy day', () => {
    const S = state([
      logged('heavy', '2026-10-01'),
      logged('light', '2026-10-08', { weight: 40, reps: 15, targetReps: 15 })
    ])
    expect(exerciseSessionsFor(S, LIFT, cfg, 'heavy').map(s => s.rid)).toEqual(['heavy'])
    expect(nextPrescription(S, cfg, routine('heavy')))
      .toMatchObject({ kind: 'up', weight: 62.5 })
  })

  it('retains routine-specific progression for unstamped legacy sessions', () => {
    const old = logged('heavy', '2026-10-01')
    delete old.entries[0].planned
    const S = state([old, logged('light', '2026-10-08', { weight: 40, reps: 15, targetReps: 15 })])
    expect(exerciseSessionsFor(S, LIFT, cfg, 'heavy').map(s => s.rid)).toEqual(['heavy'])
  })

  it('does not treat rehab or excluded sets as a new performance baseline', () => {
    const skip = logged('push', '2026-10-08', { weight: 30, reps: 10 })
    skip.entries[0].noProg = true
    const S = state([logged('fullbody', '2026-10-01'), skip])
    expect(exerciseSessionsFor(S, LIFT, cfg, 'fullbody').map(s => s.rid)).toEqual(['fullbody'])
    expect(nextPrescription(S, cfg, routine('fullbody')))
      .toMatchObject({ kind: 'up', weight: 62.5 })
  })
})
