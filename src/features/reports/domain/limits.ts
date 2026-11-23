/**
 * Constantes del cliente (docs/05-parametrizacion.md · Constantes del dominio).
 * Si cambias un límite que también está en storage.rules o firestore.rules, cámbialo allá.
 */
export const PHOTO_MAX_EDGE_PX = 1600;
export const PHOTO_JPEG_QUALITY = 0.7;
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
// Pisos de los rangos de docs/05-parametrizacion.md: hasta ahí baja la compresión si una foto
// con mucho detalle no cabe en PHOTO_MAX_BYTES con los valores normales.
export const PHOTO_MIN_EDGE_PX = 800;
export const PHOTO_MIN_JPEG_QUALITY = 0.5;

export const LOCATION_MAX_ACCURACY_M = 50;
export const LOCATION_GOOD_ACCURACY_M = 10;
// Cada cuánto se pide una lectura nueva mientras la pantalla Reportar está abierta: el GPS
// tarda unos segundos en afinar y el usuario ve mejorar la precisión sin gastar batería de más.
export const LOCATION_UPDATE_INTERVAL_MS = 2_000;

export const NOTE_MAX_CHARS = 280;

export const UPLOAD_MAX_ATTEMPTS = 8;
export const UPLOAD_BACKOFF_BASE_MS = 2_000;
export const UPLOAD_BACKOFF_MAX_MS = 5 * 60_000;

export type AccuracyLevel = 'good' | 'acceptable' | 'too_low';

/** Clasifica la precisión del GPS para mostrarla antes de enviar. */
export function accuracyLevel(accuracyM: number | null | undefined): AccuracyLevel {
  if (accuracyM == null || !Number.isFinite(accuracyM) || accuracyM < 0) return 'too_low';
  if (accuracyM <= LOCATION_GOOD_ACCURACY_M) return 'good';
  if (accuracyM <= LOCATION_MAX_ACCURACY_M) return 'acceptable';
  return 'too_low';
}

/**
 * Espera antes del intento `attempt` (1 = primer reintento) de la cola de subida.
 * Exponencial con tope; `null` cuando ya no se debe reintentar.
 */
export function uploadBackoffMs(attempt: number): number | null {
  if (!Number.isInteger(attempt) || attempt < 1) return 0;
  if (attempt >= UPLOAD_MAX_ATTEMPTS) return null;
  return Math.min(UPLOAD_BACKOFF_BASE_MS * 2 ** (attempt - 1), UPLOAD_BACKOFF_MAX_MS);
}
