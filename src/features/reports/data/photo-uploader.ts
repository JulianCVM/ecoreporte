import { getMetadata, putFile, ref, setMaxUploadRetryTime, storage } from '@/lib/firebase';

import { UPLOAD_ATTEMPT_TIMEOUT_MS } from '../domain/limits';
import type { UploadEntry, UploadOutcome } from '../domain/upload-queue';
import { queuedPhotoExists } from './upload-queue-store';

/** Código que Storage usa cuando las reglas niegan la operación. */
const UNAUTHORIZED = 'storage/unauthorized';

let retryTimeConfigured = false;

/** Acota el reintento interno del SDK una sola vez (ver `UPLOAD_ATTEMPT_TIMEOUT_MS`). */
async function configureRetryTime(): Promise<void> {
  if (retryTimeConfigured) return;
  await setMaxUploadRetryTime(storage(), UPLOAD_ATTEMPT_TIMEOUT_MS);
  retryTimeConfigured = true;
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `${errorCode(error) ?? 'sin código'}: ${message}`;
}

/**
 * Intenta subir una foto de la cola y traduce el resultado para `processUploadQueue`.
 *
 * `storage.rules` solo deja crear el archivo una vez. Si un intento anterior sí llegó pero la
 * app se cerró antes de anotarlo, el reintento recibe «no autorizado»: en ese caso se comprueba
 * que el archivo ya existe y se cuenta como subido (AM-21), en vez de reintentar para siempre.
 */
export async function uploadQueuedPhoto(entry: UploadEntry): Promise<UploadOutcome> {
  if (!queuedPhotoExists(entry.localUri)) {
    return { kind: 'fatal', message: `La foto local ya no existe: ${entry.localUri}` };
  }
  const target = ref(storage(), entry.storagePath);
  try {
    await configureRetryTime();
    await putFile(target, entry.localUri, { contentType: 'image/jpeg' });
    return { kind: 'uploaded' };
  } catch (error) {
    if (errorCode(error) === UNAUTHORIZED && (await isAlreadyUploaded(entry.storagePath))) {
      return { kind: 'uploaded' };
    }
    return { kind: 'retry', message: describe(error) };
  }
}

/** `true` si el archivo ya está en Storage. El autor puede leer su propia foto. */
async function isAlreadyUploaded(storagePath: string): Promise<boolean> {
  try {
    await getMetadata(ref(storage(), storagePath));
    return true;
  } catch (error) {
    // No se pudo confirmar (no existe, o no hay red): el intento cuenta como fallido y se
    // reintenta; el motivo queda en el registro.
    console.warn(`[upload-queue] no se pudo confirmar ${storagePath} en Storage`, error);
    return false;
  }
}
