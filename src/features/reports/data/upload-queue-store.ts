import { Directory, File, Paths } from 'expo-file-system';

import { uploadEntrySchema, type UploadEntry } from '../domain/upload-queue';

/**
 * Persistencia de la cola de subida (ADR 0004): un JSON y las fotos pendientes en el
 * almacenamiento de documentos de la app. A diferencia del caché, el sistema no lo borra, así
 * que la cola sobrevive al cierre de la app y al reinicio del teléfono.
 *
 * Se usan las variantes síncronas a propósito: leer, cambiar y guardar ocurre sin que otro
 * código se intercale, y la cola no necesita candados.
 */
const QUEUE_DIRECTORY = 'upload-queue';
const QUEUE_FILE = 'queue.json';

function queueDirectory(): Directory {
  const directory = new Directory(Paths.document, QUEUE_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

/**
 * Lee la cola. Una entrada que no cumple el esquema se descarta y se registra: una sola entrada
 * dañada no puede dejar bloqueadas las demás fotos.
 */
export function loadUploadQueue(): UploadEntry[] {
  const file = new File(queueDirectory(), QUEUE_FILE);
  if (!file.exists) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(file.textSync());
  } catch (cause) {
    console.error('[upload-queue] queue.json no es JSON válido; la cola empieza vacía', cause);
    return [];
  }
  if (!Array.isArray(raw)) {
    console.error('[upload-queue] queue.json no contiene una lista; la cola empieza vacía');
    return [];
  }
  return raw.flatMap((candidate: unknown) => {
    const parsed = uploadEntrySchema.safeParse(candidate);
    if (parsed.success) return [parsed.data];
    console.error('[upload-queue] se descartó una entrada inválida', parsed.error.issues);
    return [];
  });
}

/** Guarda la cola completa. */
export function saveUploadQueue(entries: readonly UploadEntry[]): void {
  const file = new File(queueDirectory(), QUEUE_FILE);
  if (!file.exists) file.create();
  file.writeSync(JSON.stringify(entries));
}

/**
 * Copia la foto del caché al almacenamiento de la cola, con el ID del reporte como nombre.
 *
 * @returns URI de la copia, que es la que se sube.
 */
export function storeQueuedPhoto(sourceUri: string, reportId: string): string {
  const destination = new File(queueDirectory(), `${reportId}.jpg`);
  new File(sourceUri).copySync(destination, { overwrite: true });
  return destination.uri;
}

/** Borra la copia local de una foto que ya subió o cuyo reporte se canceló. */
export function deleteQueuedPhoto(localUri: string): void {
  const file = new File(localUri);
  if (file.exists) file.delete();
}

/** `true` si la copia local de la foto sigue en el teléfono. */
export function queuedPhotoExists(localUri: string): boolean {
  return new File(localUri).exists;
}
