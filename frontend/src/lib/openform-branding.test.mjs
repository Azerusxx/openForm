import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8')

test('openForm branding never points update checks to upstream openGym', () => {
  const update = read('./update.js')
  const settings = read('../views/Settings.jsx')
  const login = read('../views/Login.jsx')
  const intro = read('../views/MobileOnboarding.jsx')
  assert.ok(update.includes("UPDATE_REPO = 'Azerusxx/openForm'"))
  assert.ok(!update.includes("const REPO = 'DuarteSantos8/openGym'"))
  assert.ok(settings.includes('openForm v{__APP_VERSION__}'))
  assert.ok(login.includes('>openForm</h1>'))
  assert.ok(intro.includes('>openForm</h1>'))
})

test('legacy storage keys are not renamed without migration', () => {
  const push = read('./push.js')
  const language = read('./default-lang.js')
  assert.match(push, /DEVICE_KEY = 'gym_device'/)
  assert.match(language, /CACHE_KEY = 'gym_default_lang'/)
})
