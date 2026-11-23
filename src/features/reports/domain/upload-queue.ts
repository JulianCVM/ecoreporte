import { z } from 'zod';

import { uploadBackoffMs } from './limits';

/**
 * Cola de subida de fotos (ADR 0004). Storage no encola subidas sin conexión, así que la app
 * guarda cada foto pendiente y la reintenta con espera exponencial.
 *
 * Aquí vive la lógica pura; `data/upload-queue.ts` pone el archivo, la red y Storage.
 */
export const uploadEntrySchema = z.object({
  reportId: z.string().min(1),
  authorUid: z.string().min(1),
  /** Ruta de destino en Storage (`reports/{uid}/{reportId}.jpg`). */
  storagePath: z.string().min(1),
  /** Copia de la foto en el almacenamiento de la app: sobrevive al cierre y al caché. */
  localUri: z.string().min(1),
  /** Intentos fallidos hasta ahora. */
  attempts: z.number().int().min(0),
  /** No se reintenta antes de este momento (epoch en ms). */
  nextAttemptAtMs: z.number().min(0),
  /** `failed`: se agotaron los intentos o el error no tiene arreglo; espera al usuario. */
  state: z.enum(['pending', 'failed']),
  lastError: z.string().nullable(),
});
export type UploadEntry = z.infer<typeof uploadEntrySchema>;

export const uploadQueueSchema = z.array(uploadEntrySchema);

/** Resultado de un intento de subida, ya interpretado por la capa de datos. */
export type UploadOutcome =
  | { kind: 'uploaded' }
  /** Falla pasajera (sin red, timeout): se reintenta con espera. */
  | { kind: 'retry'; message: string }
  /** Falla sin arreglo (el archivo local ya no existe): no tiene sentido reintentar. */
  | { kind: 'fatal'; message: string };

export type UploadQueueDeps = {
  load: () => Promise<UploadEntry[]>;
  save: (entries: UploadEntry[]) => Promise<void>;
  upload: (entry: UploadEntry) => Promise<UploadOutcome>;
  /** Borra la copia local cuando ya no hace falta. */
  removeLocalFile: (entry: UploadEntry) => void;
  nowMs: () => number;
};

export type QueueRunSummary = {
  uploaded: string[];
  failed: string[];
  /** Cuándo vuelve a tocar un intento del usuario actual; `null` si no queda nada pendiente. */
  nextAttemptAtMs: number | null;
};

/** Entrada nueva: primer intento inmediato. */
export function newUploadEntry(
  report: { reportId: string; authorUid: string; storagePath: string; localUri: string },
  nowMs: number,
): UploadEntry {
  return { ...report, attempts: 0, nextAttemptAtMs: nowMs, state: 'pending', lastError: null };
}

/** Agrega la entrada; si el reporte ya estaba en la cola, la reemplaza (no se sube dos veces). */
export function withEntry(entries: readonly UploadEntry[], entry: UploadEntry): UploadEntry[] {
  return [...entries.filter((current) => current.reportId !== entry.reportId), entry];
}

/** Quita un reporte de la cola (subido o cancelado por su autor). */
export function withoutReport(entries: readonly UploadEntry[], reportId: string): UploadEntry[] {
  return entries.filter((entry) => entry.reportId !== reportId);
}

/**
 * La entrada después de un intento fallido: suma el intento y calcula la próxima espera con
 * `uploadBackoffMs`. Al llegar a `UPLOAD_MAX_ATTEMPTS`, o si el error no tiene arreglo, queda
 * en `failed` y ya no se reintenta sola.
 */
export function afterFailedAttempt(
  entry: UploadEntry,
  outcome: Exclude<UploadOutcome, { kind: 'uploaded' }>,
  nowMs: number,
): UploadEntry {
  const attempts = entry.attempts + 1;
  const backoffMs = outcome.kind === 'fatal' ? null : uploadBackoffMs(attempts);
  return {
    ...entry,
    attempts,
    lastError: outcome.message,
    state: backoffMs == null ? 'failed' : 'pending',
    nextAttemptAtMs: backoffMs == null ? entry.nextAttemptAtMs : nowMs + backoffMs,
  };
}

/** Vuelve a poner en marcha una entrada fallida cuando el usuario pide reintentar. */
export function retried(entry: UploadEntry, nowMs: number): UploadEntry {
  return { ...entry, attempts: 0, state: 'pending', nextAttemptAtMs: nowMs, lastError: null };
}

/**
 * La cola después de que el usuario pide reintentar un reporte. Solo cambia una entrada
 * `failed`: una que sigue pendiente ya tiene su espera y no debe saltársela a mano.
 */
export function withRetriedReport(
  entries: readonly UploadEntry[],
  reportId: string,
  nowMs: number,
): UploadEntry[] {
  return entries.map((entry) =>
    entry.reportId === reportId && entry.state === 'failed' ? retried(entry, nowMs) : entry,
  );
}

/** Entradas del usuario a las que ya les toca un intento. */
export function dueEntries(
  entries: readonly UploadEntry[],
  authorUid: string,
  nowMs: number,
): UploadEntry[] {
  return entries.filter(
    (entry) =>
      entry.authorUid === authorUid && entry.state === 'pending' && entry.nextAttemptAtMs <= nowMs,
  );
}

function nextAttemptAt(entries: readonly UploadEntry[], authorUid: string): number | null {
  const pending = entries.filter(
    (entry) => entry.authorUid === authorUid && entry.state === 'pending',
  );
  return pending.length > 0 ? Math.min(...pending.map((entry) => entry.nextAttemptAtMs)) : null;
}

/**
 * Hace una pasada por la cola: sube lo que ya toca del usuario actual y guarda el resultado
 * después de cada foto, para que cerrar la app a mitad de camino no pierda ni repita trabajo.
 *
 * Solo procesa las fotos de `authorUid`: Storage exige que quien sube sea el autor.
 */
export async function processUploadQueue(
  deps: UploadQueueDeps,
  authorUid: string,
): Promise<QueueRunSummary> {
  const summary: QueueRunSummary = { uploaded: [], failed: [], nextAttemptAtMs: null };
  let entries = await deps.load();

  for (const due of dueEntries(entries, authorUid, deps.nowMs())) {
    const outcome = await deps.upload(due);
    // Se relee antes de guardar: mientras subía, el usuario pudo crear o cancelar otro reporte.
    entries = await deps.load();
    if (!entries.some((entry) => entry.reportId === due.reportId)) continue;

    if (outcome.kind === 'uploaded') {
      entries = withoutReport(entries, due.reportId);
      await deps.save(entries);
      deps.removeLocalFile(due);
      summary.uploaded.push(due.reportId);
      continue;
    }
    const updated = afterFailedAttempt(due, outcome, deps.nowMs());
    entries = withEntry(entries, updated);
    await deps.save(entries);
    if (updated.state === 'failed') summary.failed.push(due.reportId);
  }

  summary.nextAttemptAtMs = nextAttemptAt(entries, authorUid);
  return summary;
}
