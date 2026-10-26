// Only merge two entries proven to be complementary parts of one product.
// Never union different historical checkmarks: that would fabricate intake.
const normName = value => String(value || '').trim().toLocaleLowerCase('de')
  .replace(/[-_\s]+/g, ' ')
const keys = x => Object.keys(x?.nutrients || {}).filter(k => Number(x.nutrients[k]) > 0)
const dates = x => [...new Set(x?.logs || [])].sort()
export function omega3PairCandidate(a, b) {
  if (!a || !b || a.id === b.id) return false
  if (!/^omega\s*3$/.test(normName(a.name)) || normName(a.name) !== normName(b.name)) return false
  if (a.unit !== b.unit || Number(a.dose) !== Number(b.dose) || !(Number(a.dose) > 0)) return false
  const ak = keys(a), bk = keys(b)
  // Explicitly limit to the observed complementary EPA/DHA case: no hidden
  // extra ingredients, no omega3 total that could be counted separately.
  return ak.length === 1 && bk.length === 1 &&
    ((ak[0] === 'epa' && bk[0] === 'dha') || (ak[0] === 'dha' && bk[0] === 'epa'))
}
export function omega3MergeReview(a, b) {
  if (!omega3PairCandidate(a, b)) return { allowed: false, reason: 'incompatible' }
  const aDays = dates(a), bDays = dates(b)
  if (JSON.stringify(aDays) !== JSON.stringify(bDays)) {
    return { allowed: false, reason: 'different-history', aDays, bDays }
  }
  return { allowed: true, days: aDays }
}
export function mergeOmega3Pair(supplements, leftId, rightId) {
  const a = supplements.find(s => s.id === leftId)
  const b = supplements.find(s => s.id === rightId)
  const review = omega3MergeReview(a, b)
  if (!review.allowed) return { changed: false, reason: review.reason, supplements }
  const combined = { ...a, nutrients: { ...a.nutrients, ...b.nutrients }, logs: review.days }
  // Preserve the first ID and its position, remove only the selected partner.
  return { changed: true, supplements: supplements.filter(s => s.id !== rightId)
    .map(s => s.id === leftId ? combined : s), mergedId: leftId }
}
export function omega3Pairs(supplements) {
  const result = []
  for (let i=0;i<supplements.length;i++) for(let j=i+1;j<supplements.length;j++) {
    if (omega3PairCandidate(supplements[i], supplements[j]))
      result.push({ left: supplements[i], right: supplements[j],
        review: omega3MergeReview(supplements[i], supplements[j]) })
  }
  return result
}
