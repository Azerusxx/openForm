import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read=rel=>readFileSync(new URL(rel,import.meta.url),'utf8')
test('calorie deficit target never includes exercise calories',()=>{
 const src=read('../views/Nutrition.jsx')
 assert.match(src,/const remaining = Math\.round\(\(data\.goals\.kcal \|\| 0\) - totals\.kcal\)/)
 assert.doesNotMatch(src,/const remaining = .*\+ burned/)
})
test('water and favorites have one-touch shortcuts and unknown macro goals are explicit',()=>{
 const src=read('../views/Nutrition.jsx')
 for(const term of ['of-water-fast','addWater(250)','addWater(500)','of-food-shortcuts','Zuletzt gegessen','g erfasst']) assert.ok(src.includes(term),term)
})
test('bottom navigation remains routed correctly with German labels',()=>{
 const src=read('../components/TabBar.jsx')
 for(const term of ['Start','Plan','Essen','Training','Statistik','Übungen','/nutrition','/stats','/library']) assert.ok(src.includes(term),term)
})
test('Android app ID preserved across updates',()=>{
 const src=read('../../android/app/build.gradle')
 for(const term of ['applicationId "app.openform.personal"','applicationIdSuffix ".test"','versionName "0.3.7a"']) assert.ok(src.includes(term),term)
})

test('CI explicitly signs with the secret-backed stable keystore',()=>{
 const gradle=read('../../android/app/build.gradle')
 const workflow=read('../../../.github/workflows/android-apk.yml')
 assert.match(gradle,/signingConfig signingConfigs\.openformDebug/)
 assert.match(gradle,/OPENFORM_DEBUG_KEYSTORE_PATH/)
 assert.match(workflow,/OPENFORM_DEBUG_KEYSTORE_PATH=\$HOME\/.android\/debug.keystore/)
})
