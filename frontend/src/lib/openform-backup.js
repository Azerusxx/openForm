import { normalizedNutrition } from './nutrition.js'

// A complete portable JSON snapshot. Training format is deliberately unchanged:
// existing OpenGym imports continue to work through their original import flow.
export const COMPLETE_KIND = 'openform-complete'
export const COMPLETE_VERSION = 1

export function createCompleteBackup(training, nutrition, now = new Date()) {
  if (!training || typeof training !== 'object' || !Array.isArray(training.workouts) || !Array.isArray(training.bodyweight)) {
    throw new Error('Trainingsdaten fehlen. Komplettbackup nicht erstellt.')
  }
  return {
    kind: COMPLETE_KIND,
    schemaVersion: COMPLETE_VERSION,
    exportedAt: now.toISOString(),
    training,
    nutrition: normalizedNutrition(nutrition),
    notes: 'Training und Ernährung als JSON. Fotos/Videos separat über das Medien-ZIP sichern. Eigene Übungsbilder unter Übungen → Bilder sichern separat exportieren und auf dem neuen Gerät importieren. Kein Cloud-Sync der Ernährung.'
  }
}

export function parseCompleteBackup(raw) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!data || data.kind !== COMPLETE_KIND || data.schemaVersion !== COMPLETE_VERSION ||
      !data.training || typeof data.training !== 'object' ||
      !Array.isArray(data.training.workouts) || !Array.isArray(data.training.bodyweight) ||
      !Array.isArray(data.training.routines) ||
      !data.nutrition || data.nutrition.schemaVersion !== 1 || !Array.isArray(data.nutrition.entries)) {
    throw new Error('Ungültiges openForm-Komplettbackup. Training und Ernährung müssen enthalten sein.')
  }
  return { training: data.training, nutrition: normalizedNutrition(data.nutrition), exportedAt: data.exportedAt }
}
