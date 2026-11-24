// Experimental barometric height-based repetition estimates for moving weight stacks.
// A pressure sensor measures RELATIVE altitude independent of phone orientation.
// A short machine stroke may be below its resolution: never fabricate a count.
const finite = value => typeof value === 'number' && Number.isFinite(value)
const clamp = (x, low, high) => Math.min(high, Math.max(low, x))
const median = arr => { const sorted = [...arr].sort((a, b) => a - b); return sorted[Math.floor(sorted.length / 2)] || 0 }
const quantile = (arr, p) => { const sorted = [...arr].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * p)] || 0 }

export class HeightRepDetector {
  constructor() { this.resetCalibration() }
  resetCalibration() {
    this.samples = []
    this.calibration = null
    this.running = false
    this.count = 0
    this.lastT = null
    this.startT = null
    this.filtered = null
    this.base = null
    this.height = 0
    this.armed = false
    this.topAt = 0
    this.lastRepAt = -Infinity
  }
  process({ t, h }) {
    if (!finite(t) || !finite(h) || Math.abs(h) > 8 || (this.lastT !== null && t <= this.lastT)) return null
    if (this.lastT != null && t - this.lastT > 1300) {
      // Sensor suspension: disarm rather than count a stale pressure jump.
      this.armed = false
      if (this.running) this.base = null
    }
    this.lastT = t
    if (this.startT === null) this.startT = t
    this.filtered = this.filtered === null ? h : this.filtered * .6 + h * .4
    if (this.base === null) this.base = this.filtered
    this.height = this.filtered - this.base
    return {t, h:this.height}
  }
  collect(point) {
    const sample = this.process(point)
    if (!sample) return false
    if (this.samples.length < 2500) this.samples.push(sample)
    return true
  }
  finishCalibration() {
    if (this.samples.length < 18 || this.samples[this.samples.length - 1].t - this.samples[0].t < 3800) {
      return {ok:false,reason:'Zu wenige Höhenmesswerte. Gerät am unteren Anschlag kurz ruhig halten und drei vollständige Wiederholungen ausführen.'}
    }
    const start = this.samples[0].t
    const idle = this.samples.filter(s => s.t - start < 650).map(s => s.h)
    if (idle.length < 3) return {ok:false,reason:'Barometerdaten zu langsam. Bitte am unteren Anschlag etwas länger ruhig halten.'}
    const base = median(idle)
    const noise = Math.sqrt(idle.reduce((n,x) => n + (x-base)**2,0) / idle.length)
    const heights = this.samples.map(s => s.h - base)
    const amplitude = Math.max(quantile(heights,.95),0)
    if (amplitude < .20 || amplitude < Math.max(.20,noise*4)) {
      return {ok:false,reason:'Der Höhenunterschied ist für dieses Barometer zu klein oder das Signal zu unruhig. Bitte Bewegungsmodus verwenden.'}
    }
    const up = Math.max(.16, amplitude*.56, noise*3.5)
    const down = Math.max(.055, Math.min(up*.4, amplitude*.22 + noise))
    let armed = false, topAt = null, previous = -Infinity
    const completed = []
    for (let i=0;i<this.samples.length;i++) {
      const sample = this.samples[i], h = heights[i]
      if (!armed && h >= up) { armed = true; topAt = sample.t }
      else if (armed && h <= down) {
        if (sample.t - topAt >= 170 && sample.t - previous >= 600 && sample.t - topAt <= 12000) {
          completed.push(sample.t); previous = sample.t
        }
        armed = false
      }
    }
    if (completed.length !== 3) return {ok:false,reason:`Kalibrierung hat ${completed.length} vollständige Höhenzyklen erkannt, erwartet werden 3. Bei zu wenig Hub bitte Bewegungsmodus verwenden.`}
    const periodMs = (completed[2] - completed[0])/2
    if (periodMs < 700 || periodMs > 9000) return {ok:false,reason:'Höhenverlauf zu schnell oder zu unregelmäßig. Langsam und kontrolliert wiederholen.'}
    this.calibration = {up, down, amplitude, noise, periodMs, mode:'height'}
    this.samples = []
    this.running = false
    return {ok:true,...this.calibration,heightCm:Math.round(amplitude*100),noiseCm:Math.round(noise*100)}
  }
  start() {
    if (!this.calibration) return false
    this.running = true
    this.count = 0
    this.lastT = null
    this.startT = null
    this.base = null
    this.filtered = null
    this.armed = false
    this.topAt = 0
    this.lastRepAt = -Infinity
    this.height = 0
    return true
  }
  push(point) {
    if (!this.running || !this.calibration) return this.count
    const sample = this.process(point)
    if (!sample) return this.count
    // Stack must be at rest at its lower position when the measurement begins.
    if (sample.t - this.startT < 400) return this.count
    const {up,down,periodMs} = this.calibration
    if (!this.armed && sample.h >= up) { this.armed = true; this.topAt = sample.t }
    else if (this.armed && sample.h <= down) {
      const travelMs = sample.t - this.topAt
      if (travelMs >= 180 && travelMs <= 12000 && sample.t - this.lastRepAt >= clamp(periodMs*.43,650,4200) && this.count < 200) {
        this.count++
        this.lastRepAt = sample.t
      }
      this.armed = false
    }
    return this.count
  }
  stop() { this.running = false; return this.count }
}
