import { describe, it, expect } from 'vitest'
import { cleanSupplements, repeatMeal, createRecipe, logRecipe } from './nutrition-extra.js'
import { dayMicros, parseOpenFoodFacts } from './nutrition.js'
import { buildSupplementNotifications } from './supplement-reminders.js'

describe('micronutrients and supplements regressions', () => {
  it('preserves multiple supplement nutrients and optional reminders through cleanup', () => {
    const [item] = cleanSupplements([{id:'m',name:'Multi',dose:2,unit:'piece',
      nutrients:{magnesium:50,vitaminC:30,vitaminD:5},reminderTime:'20:00',reminderEnabled:true,logs:['2026-11-04']}])
    expect(item.nutrients).toEqual({magnesium:50,vitaminC:30,vitaminD:5})
    expect(item.reminderTime).toBe('20:00')
    expect(item.reminderEnabled).toBe(true)
  })
  it('keeps unknown food micronutrients unknown while reading known OFF amounts', () => {
    const product=parseOpenFoodFacts({status:'success',product:{product_name:'Test',nutriments:{
      'energy-kcal_100g':100,proteins_100g:2,carbohydrates_100g:10,fat_100g:3,
      fiber_100g:4,magnesium_100g:0.12}}},'12345678')
    expect(product.per100Micros.fiber).toBe(4)
    expect(product.per100Micros.magnesium).toBe(120)
    expect(product.per100Micros.vitaminD).toBeUndefined()
  })
  it('keeps micronutrients in recipes and scales by portions', () => {
    const food={name:'Beans',quantity:200,unit:'g',basis:'g',per100:{kcal:90,protein:5,carbs:12,fat:1},per100Micros:{fiber:8}}
    const recipe=createRecipe('Beans', [food],2)
    const logs=logRecipe(recipe,1,'2026-11-04')
    expect(dayMicros(logs,'2026-11-04').fiber).toBe(8)
  })
  it('only reminds outstanding supplements, never marks a dose as taken', () => {
    const supplements=[
      {id:'a',name:'Omega',reminderEnabled:true,reminderTime:'20:00',logs:['2026-11-04']},
      {id:'b',name:'Magnesium',reminderEnabled:true,reminderTime:'20:00',logs:[]},
      {id:'c',name:'Kreatin',reminderEnabled:false,reminderTime:'20:00',logs:[]}
    ]
    const original=JSON.stringify(supplements)
    const alerts=buildSupplementNotifications(supplements,new Date(2026,10,4,19,0))
    expect(alerts[0].body).toContain('Magnesium')
    expect(alerts[0].body).not.toContain('Omega')
    expect(alerts[0].body).not.toContain('Kreatin')
    expect(JSON.stringify(supplements)).toBe(original)
  })
})
