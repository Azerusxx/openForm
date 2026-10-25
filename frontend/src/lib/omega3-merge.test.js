import { describe, it, expect } from 'vitest'
import { omega3PairCandidate, omega3MergeReview, mergeOmega3Pair } from './omega3-merge.js'
import { nutrientOverview } from './nutrient-overview.js'
const date='2026-10-25'
const epa={id:'one',name:'Omega 3',unit:'piece',dose:1,nutrients:{epa:360},logs:[date,'2026-10-24']}
const dha={id:'two',name:'Omega 3',unit:'piece',dose:1,nutrients:{dha:240},logs:['2026-10-24',date]}
describe('0.4.0e omega3 consolidation',()=>{
  it('merges complementary ingredients without doubling intake or losing checks',()=>{
    expect(omega3PairCandidate(epa,dha)).toBe(true)
    const original={entries:[],supplements:[epa,dha]}
    const merged=mergeOmega3Pair(original.supplements,'one','two')
    expect(merged.changed).toBe(true)
    expect(merged.supplements).toHaveLength(1)
    expect(merged.supplements[0].logs).toEqual(['2026-10-24',date])
    for(const key of ['epa','dha']){
      const before=nutrientOverview(original,date).find(n=>n.key===key).total
      const after=nutrientOverview({...original,supplements:merged.supplements},date).find(n=>n.key===key).total
      expect(after).toBe(before)
    }
    expect(merged.supplements[0].nutrients).toEqual({epa:360,dha:240})
  })
  it('blocks unequal historical intake dates rather than fabricating checkmarks',()=>{
    const other={...dha,logs:[date]}
    expect(omega3MergeReview(epa,other).reason).toBe('different-history')
    const result=mergeOmega3Pair([epa,other],'one','two')
    expect(result.changed).toBe(false)
    expect(result.supplements).toHaveLength(2)
  })
  it('never silently combines different doses, ingredients or unrelated products',()=>{
    expect(omega3PairCandidate(epa,{...dha,dose:2})).toBe(false)
    expect(omega3PairCandidate(epa,{...dha,nutrients:{epa:240}})).toBe(false)
    expect(omega3PairCandidate(epa,{...dha,name:'Magnesium'})).toBe(false)
    expect(omega3PairCandidate(epa,{...dha,nutrients:{dha:240,magnesium:10}})).toBe(false)
  })
})
