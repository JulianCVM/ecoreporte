import { UPLOAD_BACKOFF_BASE_MS, UPLOAD_MAX_ATTEMPTS } from '../limits';
import {
  afterFailedAttempt,
  dueEntries,
  newUploadEntry,
  processUploadQueue,
  retried,
  withEntry,
  withoutReport,
  type UploadEntry,
  type UploadOutcome,
  type UploadQueueDeps,
} from '../upload-queue';

const UID = 'uid-1';
const T0 = 1_795_000_000_000;

const entry = (reportId: string, overrides: Partial<UploadEntry> = {}): UploadEntry => ({
  ...newUploadEntry(
    {
      reportId,
      authorUid: UID,
      storagePath: `reports/${UID}/${reportId}.jpg`,
      localUri: `file:///docs/upload-queue/${reportId}.jpg`,
    },
    T0,
  ),
  ...overrides,
});

/** Cola en memoria que se comporta como el archivo: `load` devuelve lo último que se guardó. */
function fakeQueue(initial: UploadEntry[], outcomes: Record<string, UploadOutcome[]>) {
  let stored = initial;
  let nowMs = T0;
  const removed: string[] = [];
  const attempted: string[] = [];
  const deps: UploadQueueDeps = {
    load: async () => stored,
    save: async (entries) => {
      stored = entries;
    },
    upload: async ({ reportId }) => {
      attempted.push(reportId);
      return outcomes[reportId]?.shift() ?? { kind: 'uploaded' };
    },
    removeLocalFile: ({ reportId }) => removed.push(reportId),
    nowMs: () => nowMs,
  };
  return {
    deps,
    removed,
    attempted,
    stored: () => stored,
    replace: (entries: UploadEntry[]) => {
      stored = entries;
    },
    advanceTo: (ms: number) => {
      nowMs = ms;
    },
  };
}

const offline: UploadOutcome = { kind: 'retry', message: 'sin conexión' };

describe('entradas de la cola', () => {
  it('una entrada nueva se intenta de inmediato', () => {
    expect(dueEntries([entry('a')], UID, T0)).toHaveLength(1);
  });

  it('volver a encolar el mismo reporte lo reemplaza: no se sube dos veces', () => {
    const queue = withEntry([entry('a', { attempts: 3 })], entry('a'));
    expect(queue).toHaveLength(1);
    expect(queue[0].attempts).toBe(0);
  });

  it('cancelar quita el reporte de la cola', () => {
    expect(withoutReport([entry('a'), entry('b')], 'a').map((e) => e.reportId)).toEqual(['b']);
  });
});

describe('afterFailedAttempt', () => {
  it('espera más en cada reintento', () => {
    const first = afterFailedAttempt(entry('a'), offline, T0);
    const second = afterFailedAttempt(first, offline, T0);

    expect(first).toMatchObject({ attempts: 1, state: 'pending', lastError: 'sin conexión' });
    expect(first.nextAttemptAtMs).toBe(T0 + UPLOAD_BACKOFF_BASE_MS);
    expect(second.nextAttemptAtMs).toBe(T0 + UPLOAD_BACKOFF_BASE_MS * 2);
  });

  it('al llegar al tope de intentos deja de reintentar sola', () => {
    const almost = entry('a', { attempts: UPLOAD_MAX_ATTEMPTS - 1 });
    expect(afterFailedAttempt(almost, offline, T0)).toMatchObject({
      attempts: UPLOAD_MAX_ATTEMPTS,
      state: 'failed',
    });
  });

  it('un error sin arreglo falla al primer intento', () => {
    const outcome: UploadOutcome = { kind: 'fatal', message: 'la foto local ya no existe' };
    expect(afterFailedAttempt(entry('a'), outcome, T0).state).toBe('failed');
  });

  it('reintentar a mano la deja como nueva', () => {
    const failed = entry('a', { attempts: 8, state: 'failed', lastError: 'sin conexión' });
    expect(retried(failed, T0 + 5)).toMatchObject({
      attempts: 0,
      state: 'pending',
      nextAttemptAtMs: T0 + 5,
      lastError: null,
    });
  });
});

describe('processUploadQueue', () => {
  it('sube lo pendiente, lo saca de la cola y borra la copia local', async () => {
    const queue = fakeQueue([entry('a'), entry('b')], {});

    const summary = await processUploadQueue(queue.deps, UID);

    expect(summary).toEqual({ uploaded: ['a', 'b'], failed: [], nextAttemptAtMs: null });
    expect(queue.stored()).toEqual([]);
    expect(queue.removed).toEqual(['a', 'b']);
  });

  it('sin red deja la foto en la cola y dice cuándo toca el reintento', async () => {
    const queue = fakeQueue([entry('a')], { a: [offline] });

    const summary = await processUploadQueue(queue.deps, UID);

    expect(summary.uploaded).toEqual([]);
    expect(summary.nextAttemptAtMs).toBe(T0 + UPLOAD_BACKOFF_BASE_MS);
    expect(queue.stored()[0]).toMatchObject({ attempts: 1, state: 'pending' });
    expect(queue.removed).toEqual([]);
  });

  it('no reintenta antes de que pase la espera', async () => {
    const queue = fakeQueue([entry('a')], { a: [offline] });
    await processUploadQueue(queue.deps, UID);

    queue.advanceTo(T0 + UPLOAD_BACKOFF_BASE_MS - 1);
    await processUploadQueue(queue.deps, UID);
    expect(queue.attempted).toEqual(['a']);

    queue.advanceTo(T0 + UPLOAD_BACKOFF_BASE_MS);
    const summary = await processUploadQueue(queue.deps, UID);
    expect(queue.attempted).toEqual(['a', 'a']);
    expect(summary.uploaded).toEqual(['a']);
  });

  it('tras agotar los intentos la deja en failed y no la vuelve a tocar', async () => {
    const queue = fakeQueue([entry('a')], {
      a: Array.from({ length: UPLOAD_MAX_ATTEMPTS + 2 }, () => offline),
    });
    let nowMs = T0;
    let summary = await processUploadQueue(queue.deps, UID);
    while (summary.nextAttemptAtMs != null) {
      nowMs = summary.nextAttemptAtMs;
      queue.advanceTo(nowMs);
      summary = await processUploadQueue(queue.deps, UID);
    }

    expect(queue.attempted).toHaveLength(UPLOAD_MAX_ATTEMPTS);
    expect(queue.stored()[0]).toMatchObject({ state: 'failed', attempts: UPLOAD_MAX_ATTEMPTS });

    queue.advanceTo(nowMs + 24 * 60 * 60 * 1000);
    await processUploadQueue(queue.deps, UID);
    expect(queue.attempted).toHaveLength(UPLOAD_MAX_ATTEMPTS);
  });

  it('reanuda después de cerrar la app: lo guardado conserva intentos y espera', async () => {
    const before = fakeQueue([entry('a')], { a: [offline] });
    await processUploadQueue(before.deps, UID);

    // «Abrir la app de nuevo»: otra instancia que parte de lo que quedó en disco.
    const after = fakeQueue(before.stored(), {});
    after.advanceTo(T0 + UPLOAD_BACKOFF_BASE_MS);
    const summary = await processUploadQueue(after.deps, UID);

    expect(summary.uploaded).toEqual(['a']);
    expect(after.stored()).toEqual([]);
  });

  it('una foto que falla no frena a las demás', async () => {
    const queue = fakeQueue([entry('a'), entry('b')], { a: [offline] });

    const summary = await processUploadQueue(queue.deps, UID);

    expect(summary.uploaded).toEqual(['b']);
    expect(queue.stored().map((e) => e.reportId)).toEqual(['a']);
  });

  it('solo sube las fotos del usuario con sesión', async () => {
    const queue = fakeQueue([entry('a'), entry('ajena', { authorUid: 'uid-2' })], {});

    const summary = await processUploadQueue(queue.deps, UID);

    expect(summary.uploaded).toEqual(['a']);
    expect(queue.stored().map((e) => e.reportId)).toEqual(['ajena']);
  });

  it('si el reporte se canceló mientras subía, no lo devuelve a la cola', async () => {
    const queue = fakeQueue([entry('a')], {});
    const upload = queue.deps.upload;
    queue.deps.upload = async (due) => {
      queue.replace([]);
      await upload(due);
      return offline;
    };

    await processUploadQueue(queue.deps, UID);

    expect(queue.stored()).toEqual([]);
  });

  it('conserva un reporte que el usuario creó mientras otro subía', async () => {
    const queue = fakeQueue([entry('a')], {});
    const upload = queue.deps.upload;
    queue.deps.upload = async (due) => {
      queue.replace([...queue.stored(), entry('nuevo', { nextAttemptAtMs: T0 + 60_000 })]);
      return upload(due);
    };

    const summary = await processUploadQueue(queue.deps, UID);

    expect(queue.stored().map((e) => e.reportId)).toEqual(['nuevo']);
    expect(summary.nextAttemptAtMs).toBe(T0 + 60_000);
  });
});
