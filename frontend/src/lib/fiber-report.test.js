import { describe, it, expect } from 'vitest'
import { dailyFiberReport } from './fiber-report.js'
const date='2026-10-25'
const food=(id,grams,fiber,extra={})=>({id,name:id, date,unit:'g', quantity:grams, unitPer100:100,
  per100Micros:fiber === null ? {} : {fiber},...extra})
describe('0.4.0f fiber from actual food values',()=>{
  it('sums food sources with portions and reports known progress',()=>{
    const report=dailyFiberReport([food('Brot',150,6),food('Brokkoli',200,3)],date)
    expect(report).toMatchObject({recorded:15,target:30,remaining:15,progress:50,unknownCount:0,complete:true})
    expect(report.sources.map(s=>s.fiber)).toEqual([9,6])
  })
  it('does not mistake missing fiber information for zero',()=>{
    const report=dailyFiberReport([food('A',100,5),food('B',100,null)],date)
    expect(report).toMatchObject({recorded:5,unknownCount:1,complete:false})
    expect(report.missing[0].name).toBe('B')
  })
  it('keeps a confirmed zero as known',()=>{
    const report=dailyFiberReport([food('Wasser',100,0)],date)
    expect(report).toMatchObject({recorded:0,knownCount:1,unknownCount:0,complete:true})
  })
  it('does not use other dates or guess from macronutrients',()=>{
    const report=dailyFiberReport([food('Yesterday',100,4,{date:'2026-10-24'}),food('Protein',100,null,{per100:{protein:40}})],date)
    expect(report).toMatchObject({recorded:0,unknownCount:1,complete:false})
  })
  it('handles piece portion conversion and missing piece size conservatively',()=>{
    const item=food('Snack',2,5,{unit:'piece',pieceSize:40})
    expect(dailyFiberReport([item],date).recorded).toBe(4)
    const unknown=dailyFiberReport([{...item,id:'no-size',pieceSize:null}],date)
    expect(unknown.unknownCount).toBe(1)
  })
})
