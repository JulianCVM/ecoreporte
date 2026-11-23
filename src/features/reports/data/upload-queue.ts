import {
  newUploadEntry,
  processUploadQueue,
  withEntry,
  withoutReport,
  withRetriedReport,
  type QueueRunSummary,
  type UploadQueueDeps,
} from '../domain/upload-queue';
import { uploadQueuedPhoto } from './photo-uploader';
import { deleteQueuedPhoto, loadUploadQueue, saveUploadQueue } from './upload-queue-store';

/** Borra la copia local sin interrumpir la cola: si falla, queda en el registro. */
function removeLocalPhoto(localUri: string): void {
  try {
    deleteQueuedPhoto(localUri);
  } catch (cause) {
    console.warn(`[upload-queue] no se pudo borrar ${localUri}`, cause);
  }
}

const deps: UploadQueueDeps = {
  load: async () => loadUploadQueue(),
  save: async (entries) => saveUploadQueue(entries),
  upload: uploadQueuedPhoto,
  removeLocalFile: (entry) => removeLocalPhoto(entry.localUri),
  nowMs: () => Date.now(),
};

type QueueListener = () => void;
const listeners = new Set<QueueListener>();

/** Avisa cuando entra o sale una foto de la cola. Devuelve la función para dejar de escuchar. */
export function onUploadQueueChange(listener: QueueListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const stateListeners = new Set<QueueListener>();

/**
 * Avisa cuando cambia lo que la pantalla muestra de la cola: entra o sale una foto, o termina
 * una pasada. Va aparte de `onUploadQueueChange`, que dispara pasadas: si una pasada avisara
 * por ese canal, se llamaría a sí misma sin parar.
 */
export function onUploadQueueState(listener: QueueListener): () => void {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}

function notifyState(): void {
  stateListeners.forEach((listener) => listener());
}

function notifyChange(): void {
  listeners.forEach((listener) => listener());
  notifyState();
}

/** Agrega la foto de un reporte recién creado; el primer intento es inmediato. */
export function enqueueUpload(report: {
  reportId: string;
  authorUid: string;
  storagePath: string;
  localUri: string;
}): void {
  saveUploadQueue(withEntry(loadUploadQueue(), newUploadEntry(report, Date.now())));
  notifyChange();
}

/** Saca un reporte de la cola y borra su foto local (reporte cancelado o rechazado). */
export function dequeueUpload(reportId: string): void {
  const entries = loadUploadQueue();
  const entry = entries.find((current) => current.reportId === reportId);
  if (!entry) return;
  saveUploadQueue(withoutReport(entries, reportId));
  removeLocalPhoto(entry.localUri);
  notifyChange();
}

/** Vuelve a poner en marcha la subida de un reporte que quedó en `failed`. */
export function retryUpload(reportId: string): void {
  saveUploadQueue(withRetriedReport(loadUploadQueue(), reportId, Date.now()));
  notifyChange();
}

let running: Promise<QueueRunSummary> | null = null;
let rerunRequested = false;

/**
 * Hace una pasada por la cola del usuario. Nunca hay dos pasadas a la vez: si se pide otra
 * mientras una corre, se hace una más al terminar, para no dejar fuera una foto recién encolada.
 */
export function runUploadQueue(authorUid: string): Promise<QueueRunSummary> {
  if (running) {
    rerunRequested = true;
    return running;
  }
  const run = async (): Promise<QueueRunSummary> => {
    let summary = await processUploadQueue(deps, authorUid);
    while (rerunRequested) {
      rerunRequested = false;
      summary = await processUploadQueue(deps, authorUid);
    }
    return summary;
  };
  running = run().finally(() => {
    running = null;
    rerunRequested = false;
    notifyState();
  });
  return running;
}
