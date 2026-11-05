import { describe,it,expect } from 'vitest'
import { restoreDecision } from './nutrition-native-backup.js'
const nutrition = entries => ({schemaVersion:1,entries,goals:{kcal:2200,protein:150}})
describe('native nutrition recovery',()=>{
  it('keeps valid existing data instead of overwriting with stale native backup',()=>{
    const local=JSON.stringify(nutrition([{id:'new',date:'2026-11-05',name:'Neu',quantity:100,unit:'g'}]))
    const native=JSON.stringify(nutrition([{id:'old',date:'2026-11-04',name:'Alt',quantity:100,unit:'g'}]))
    expect(restoreDecision(local,native)).toEqual({restore:false,reason:'local-valid'})
  })
  it('restores native data when local nutrition is missing',()=>{
    const decision=restoreDecision(null,JSON.stringify(nutrition([])))
    expect(decision.restore).toBe(true)
    expect(decision.data.schemaVersion).toBe(1)
  })
  it('recovers after corrupted local JSON only from valid native data',()=>{
    expect(restoreDecision('{broken',JSON.stringify(nutrition([]))).restore).toBe(true)
    expect(restoreDecision('{broken','{broken').restore).toBe(false)
  })
  it('will not substitute an empty malformed snapshot for real data',()=>{
    expect(restoreDecision(null,JSON.stringify({entries:[]})).restore).toBe(false)
  })
})
