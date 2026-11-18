// Exercise illustrations live in Vite public/ and are copied to dist/exercise-media.
// URLs must resolve against the loaded JavaScript module, not window.location.pathname:
// React Router may currently be on /workout/, /plan/, /nutrition/, etc.
// In dev this module is /src/lib/media-url.js (two levels below web root).
// In the production bundle it is under /assets/ (one level below app root).
const appRoot = new URL(import.meta.env?.DEV ? '../../' : '../', import.meta.url).href
const safeName = x => typeof x === 'string' && /^[a-z0-9_-]+\.webp$/i.test(x)

/** A URL that is stable across in-app navigation and Capacitor's local HTTPS origin. */
export function exerciseStillUrl(bucket, file, root = appRoot) {
  if (bucket !== 'fork180' || !safeName(file)) return null
  return new URL('exercise-media/' + bucket + '/' + file, root).href
}

/** Optional, explicitly licensed offline exercise animation, scoped to a known file type. */
export function exerciseClipUrl(bucket, file, root = appRoot) {
  if (bucket !== 'fork180' || typeof file !== 'string' || !/^[a-z0-9_-]+\.(mp4|webp)$/i.test(file)) return null
  return new URL('exercise-media/' + bucket + '/clip/' + file, root).href
}
