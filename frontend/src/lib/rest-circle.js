// Pure ring math: no hooks, no side effects; 100% at start and 0% when ready.
export function restProgress(left, total) {
  const remaining = Number(left), duration = Number(total)
  if (!Number.isFinite(remaining) || !Number.isFinite(duration) || duration <= 0) return 0
  return Math.max(0, Math.min(100, 100 * remaining / duration))
}
