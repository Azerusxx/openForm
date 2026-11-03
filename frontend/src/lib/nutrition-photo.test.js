import { describe, it, expect } from 'vitest'
import { validateMealPhoto, photoMealTotals, changeIngredientGrams } from './nutrition-photo.js'

const sample = {name:'Hähnchen mit Reis', ingredients:[
  {name:'Hähnchen',grams:150,kcal:240,protein:45,carbs:0,fat:6},
  {name:'Reis',grams:200,kcal:260,protein:5,carbs:56,fat:1}
],uncertainty:'Öl unbekannt'}

describe('food-photo analysis validation',()=>{
  it('accepts an estimate and computes per 100g correctly',()=>{
    const result=validateMealPhoto(JSON.stringify(sample))
    const totals=photoMealTotals(result.ingredients)
    expect(totals.grams).toBe(350)
    expect(totals.kcal).toBe(500)
    expect(totals.protein).toBe(50)
    expect(totals.per100.kcal).toBeCloseTo(142.86,2)
  })
  it('changes ingredient grams and scales its macros without mutating the original',()=>{
    const changed=changeIngredientGrams(sample.ingredients[0],300)
    expect(changed.kcal).toBe(480)
    expect(changed.protein).toBe(90)
    expect(sample.ingredients[0].grams).toBe(150)
  })
  it('rejects missing food and implausible estimates',()=>{
    expect(()=>validateMealPhoto({name:'',ingredients:[]})).toThrow()
    expect(()=>validateMealPhoto({...sample,ingredients:[{...sample.ingredients[0],grams:6000}]})).toThrow()
    expect(()=>validateMealPhoto('not-json')).toThrow()
  })
})
