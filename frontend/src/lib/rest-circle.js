// A presentation-only countdown fraction. useUI owns timing/notifications.
export function restCircleProgress(left, total) {
  const length = 2 * Math.PI * 102
  const duration = Number(total)
  const value = Number(left)
  const ratio = duration > 0 && Number.isFinite(duration) && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value / duration)) : 0
  return { remaining: Math.round(ratio * 100), circumference: length, offset: length * (1 - ratio) }
}
export function shouldOpenRestCircle({ timer, work, minimized } = {}) {
  return !!timer && !work && !minimized && !timer.ready
}
