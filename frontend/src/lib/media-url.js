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

/**
 * An openGym exercise may have a second drawing ID for a different figure.
 * Only choose the alternate when the licensed packager verified that file;
 * otherwise keep the original ID's still/clip. Never change exercise IDs.
 */
export function selectFigureMediaFile(ex, figure, originalFile, verifiedFigures, kind) {
  if (figure !== 'male' && figure !== 'female') return originalFile
  const candidate = verifiedFigures?.[ex?.id]?.[figure]?.[kind]
  if (kind === 'still') return safeName(candidate) ? candidate : originalFile
  if (kind === 'clip') return typeof candidate === 'string' && /^[a-z0-9_-]+\.(mp4|webp)$/i.test(candidate) ? candidate : originalFile
  return originalFile
}
