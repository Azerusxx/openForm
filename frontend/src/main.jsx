import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { MOBILE } from './lib/mobile.js'
import { useStore } from './store/useStore.js'
import { startMediaSync } from './lib/media-sync.js'
import { startNativeKeyboard } from './lib/native-keyboard.js'
import './index.css'
import { checkpointBeforeUpgrade } from './lib/openform-recovery.js'
import { restoreNutritionMirror } from './lib/nutrition-native-backup.js'

// App.jsx restores per-route scroll itself; the browser's own attempt races it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

// Non-destructive local checkpoint; external export still essential before uninstalling.
checkpointBeforeUpgrade()

// Restore native nutrition snapshot before the first React render if local storage is missing or invalid.
// Existing valid nutrition is never overwritten by an older snapshot.
await restoreNutritionMirror()
createRoot(document.getElementById('root')).render(
  <StrictMode><App /></StrictMode>
)

// Keep optional supplement reminders replenished even when the user opens only Gym.
// The scheduling code never creates intake logs or changes nutrition data.
if (MOBILE) {
  const refreshSupplements = async () => {
    try {
      const [{ loadNutrition }, { syncSupplementReminders }] = await Promise.all([
        import('./lib/nutrition.js'), import('./lib/supplement-reminders.js')
      ])
      await syncSupplementReminders(loadNutrition().supplements)
    } catch { /* permission denied/offline: reminders remain opt-in */ }
  }
  refreshSupplements()
  window.addEventListener('focus', refreshSupplements)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshSupplements()
  })
  import('@capacitor/app').then(({ App }) =>
    App.addListener('appStateChange', ({ isActive }) => { if (isActive) refreshSupplements() })
  ).catch(() => {})
}

// The photos and videos of custom exercises, in every build (the phone and the demo included):
// uploads of what the server lacks, the local clean-up, and the plan's files kept offline.
startMediaSync(useStore)

// Android 15 does not resize the page for the soft keyboard; the app says how much it covers and
// this keeps the focused field above it. Idle everywhere else.
startNativeKeyboard()

// Not in the mobile build: the native shell already serves everything from disk.
if (!MOBILE && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {})
  // The plan's exercise media, kept by the worker for a workout opened without a network (#281).
  // It only fetches ahead while the page runs as the installed app; a tab keeps what it has shown.
  import('./lib/media-prefetch.js').then(m => m.startMediaPrefetch(useStore)).catch(() => {})
}
