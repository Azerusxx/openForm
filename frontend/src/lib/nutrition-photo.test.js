import { describe, it, expect } from 'vitest'
import { parseFoodPhotoAnswer } from './nutrition-photo.js'
import { createEntry, dayMicros, entryTotals } from './nutrition.js'

describe('Food photo AI input', () => {
  it('converts whole meal nutrition into 100g values for the editable food form', () => {
    const p=parseFoodPhotoAnswer(JSON.stringify({name:'Gemüse mit Reis',grams:250,kcal:400,protein:15,carbs:65,fat:8,per100Micros:{fiber:3}}))
    expect(p.name).toBe('Gemüse mit Reis')
    expect(p.estimatedGrams).toBe(250)
    expect(p.per100.kcal).toBe(160)
    expect(p.per100Micros.fiber).toBe(3)
    const entry=createEntry({...p,quantity:p.estimatedGrams,unit:'g',date:'2026-11-04'})
    expect(entryTotals(entry).kcal).toBe(400)
    expect(dayMicros([entry],'2026-11-04').fiber).toBe(7.5)
  })
  it('rejects non-food photos instead of writing fake calories',()=>{
    expect(()=>parseFoodPhotoAnswer('{"error":"Kein Essen erkannt"}')).toThrow('Kein Essen erkannt')
  })
  it('rejects impossible quantities and unknown amounts',()=>{
    expect(()=>parseFoodPhotoAnswer('{"name":"Brot","grams":0,"kcal":200,"protein":8,"carbs":32,"fat":3}')).toThrow()
  })
  it('accepts fenced AI JSON',()=>{
    const s='\`\`\`json\n{"name":"Apfel","grams":100,"kcal":52,"protein":0.3,"carbs":14,"fat":0.2}\n\`\`\`'
    expect(parseFoodPhotoAnswer(s).per100.kcal).toBe(52)
  })
})
