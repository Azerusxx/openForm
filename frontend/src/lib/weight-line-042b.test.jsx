import { describe,it,expect } from 'vitest'
import { chartLinePath, trendSeries } from './nutrition-trends.jsx'
describe('0.4.2b weight lines retain time gaps without inventing measurements',()=>{
 it('connects all sparse weight observations chronologically',()=>{
   const p=[{value:77},{value:null},{value:null},{value:78},{value:null},{value:76}]
   const weight=chartLinePath(p,75,80,520,150,true)
   expect((weight.match(/ L/g)||[]).length).toBe(2)
   const calories=chartLinePath(p,75,80,520,150,false)
   expect((calories.match(/ L/g)||[]).length).toBe(0)
 })
 it('does not generate weight observations on unmeasured dates',()=>{
   const report=trendSeries([],[{d:'2026-10-20',w:77.5},{d:'2026-10-25',w:79.5}],'2026-10-25','7')
   expect(report.daily.filter(x=>x.weight!==null)).toHaveLength(2)
 })
})
