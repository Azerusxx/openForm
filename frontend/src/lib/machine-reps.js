// Experimental motion-based repetition estimates, not a substitute for human confirmation.
// Works on gravity-free linear acceleration from the device, entirely in RAM.
// Training data is never edited here. Real guided-machine recordings are needed to
// validate the model: controlled movement can generate two acceleration pulses per rep.

const clamp = (x, min, max) => Math.min(max, Math.max(min, x))
const percentile = (data, rank) => {
  const sorted = data.slice().sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(rank * (sorted.length - 1)))] || 0
}
const finite = n => typeof n === 'number' && Number.isFinite(n)

function extractBursts(samples, threshold) {
  const bursts = []
  let active = false
  let max = null
  let last = -Infinity
  for (const s of samples) {
    if (!active && s.a >= threshold) {
      active = true
      max = s
    } else if (active) {
      if (s.a > max.a) max = s
      if (s.a <= threshold * .55) {
        if (max.t - last >= 220) {
          bursts.push(max)
          last = max.t
        } else if (bursts.length && max.a > bursts[bursts.length - 1].a) {
          bursts[bursts.length - 1] = max
          last = max.t
        }
        active = false
      }
    }
  }
  if (active && max && max.t - last >= 220) bursts.push(max)
  return bursts
}

export class MachineRepDetector {
  constructor() {
    this.samples = []
    this.calibration = null
    this.count = 0
    this.recent = []
    this.lastT = null
    this.lastPeakAt = -Infinity
    this.above = false
    this.filtered = 0
    this.running = false
  }

  resetCalibration() {
    this.samples = []
    this.calibration = null
    this.running = false
    this.count = 0
    this.recent = []
    this.filtered = 0
    this.lastT = null
  }

  collect({ t, x, y, z }) {
    if (![t, x, y, z].every(finite)) return false
    if (Math.max(Math.abs(x),Math.abs(y),Math.abs(z)) > 60) return false
    if (this.lastT != null && t <= this.lastT) return false
    this.lastT = t
    const a = Math.sqrt(x*x + y*y + z*z)
    this.filtered = this.samples.length ? this.filtered * .45 + a * .55 : a
    if (this.samples.length < 2000) this.samples.push({t, a:this.filtered})
    return true
  }

  finishCalibration() {
    if (this.samples.length < 55) return {ok:false,reason:'Zu wenig Sensordaten. Drei vollständige, langsame Wiederholungen erfassen.'}
    const values = this.samples.map(s=>s.a)
    const high = percentile(values,.92)
    if (high < .38) return {ok:false,reason:'Kaum Bewegung erkannt. Befestigung und Sensor prüfen.'}
    const threshold = clamp(high * .58,.28,4)
    const peaks = extractBursts(this.samples,threshold)
    if (peaks.length < 3 || peaks.length > 7 || peaks.length === 4) {
      return {ok:false,reason:'Unregelmäßiges Bewegungssignal. Exakt drei ruhige Wiederholungen erneut kalibrieren.'}
    }
    const span = peaks[peaks.length - 1].t - peaks[0].t
    // Three pulses => one pulse per repetition; 5-7 => roughly two pulses
    // (start/stop of movement) per repetition.
    const divisor = peaks.length <= 3 ? 2 : 2.5
    const periodMs = span / divisor
    if (periodMs < 800 || periodMs > 5500) return {ok:false,reason:'Bewegungsrhythmus nicht eindeutig. Gleichmäßig und langsamer wiederholen.'}
    this.calibration = {threshold,periodMs,peakCount:peaks.length}
    this.samples = []
    this.lastT = null
    this.filtered = 0
    return {ok:true,...this.calibration}
  }

  start() {
    if (!this.calibration) return false
    this.running = true
    this.count = 0
    this.lastPeakAt = -Infinity
    this.lastT = null
    this.filtered = 0
    this.above = false
    return true
  }

  push({t,x,y,z}) {
    if (!this.running || !this.calibration || ![t,x,y,z].every(finite)) return this.count
    if (Math.max(Math.abs(x),Math.abs(y),Math.abs(z)) > 60) return this.count
    if (this.lastT != null && t <= this.lastT) return this.count
    const gap = this.lastT == null ? 0 : t - this.lastT
    this.lastT = t
    if (gap > 750) {
      // Sensor stopped while the app was in the background: don't count its
      // first unexplained high value as a repetition.
      this.above = false
      this.filtered = 0
      return this.count
    }
    const a = Math.sqrt(x*x + y*y + z*z)
    this.filtered = this.filtered ? this.filtered*.45 + a*.55 : a
    const threshold = this.calibration.threshold
    if (this.filtered < threshold * .55) this.above = false
    if (!this.above && this.filtered >= threshold) {
      this.above = true
      const minInterval = clamp(this.calibration.periodMs * .72,750,4200)
      if (t - this.lastPeakAt >= minInterval && this.count < 200) {
        this.count++
        this.lastPeakAt = t
      }
    }
    return this.count
  }

  stop() {
    this.running = false
    return this.count
  }
}
