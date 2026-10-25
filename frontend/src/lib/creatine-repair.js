// A conservative one-click repair for the exact legacy mis-entry seen in openForm.
// Never silently rewrite historical nutrition records or assume mixed formulations
// are pure creatine. A user explicitly confirms the correction.
export function isMisattributedCreatine(s) {
  if (!s || !/^(kreatin|creatine)(?:\s+(?:monohydrat|monohydrate))?$/i.test(String(s.name || '').trim())) return false
  if (s.unit !== 'g' || !(Number(s.dose) > 0)) return false
  const nutrients = s.nutrients || {}
  const keys = Object.keys(nutrients).filter(k => Number(nutrients[k]) > 0)
  return keys.length === 1 && keys[0] === 'magnesium' && Number(nutrients.magnesium) === 1
}
export function repairMisattributedCreatine(s) {
  if (!isMisattributedCreatine(s)) return null
  // dose is grams daily; when the entry's unit is grams, one gram per gram.
  // Preserve ids, checkmarks and the exact daily quantity; remove the wrong Mg.
  return { ...s, nutrients: { creatine: 1 } }
}
