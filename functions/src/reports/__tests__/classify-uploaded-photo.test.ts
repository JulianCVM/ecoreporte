import type { Classification } from '../../ai/classification';
import { ClassifierError, type Classifier } from '../../ai/classifier';
import {
  classifyUploadedPhoto,
  REPORT_WAIT_ATTEMPTS,
  REPORT_WAIT_MS,
  type ClassifyDeps,
} from '../classify-uploaded-photo';
import type { Evaluation, FinalOutcome, ReportStore, StartResult } from '../report-store';

const UID = 'uid-1';
const REPORT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const PHOTO_PATH = `reports/${UID}/${REPORT_ID}.jpg`;

const config: ClassifyDeps['config'] = {
  aiEnabled: true,
  aiMaxAttempts: 2,
  aiTimeoutMs: 15_000,
  aiApproveThreshold: 0.8,
  aiReviewThreshold: 0.5,
  promptVersion: 'v1',
};

const approved: Classification = {
  category: 'escombros',
  complexity: 'alta',
  confidence: 0.9,
  summary: 'Escombros sobre la vía.',
  containsPeople: false,
};

/** Reporte en memoria con las mismas comprobaciones que hace la transacción real. */
function fakeStore(report: { authorUid: string; photoPath: string; status: string } | null) {
  const state = {
    report,
    evaluations: [] as Evaluation[],
    finished: [] as FinalOutcome[],
    startCalls: 0,
  };
  const store: ReportStore = {
    startProcessing: async (_reportId, expected): Promise<StartResult> => {
      state.startCalls += 1;
      if (!state.report) return 'missing';
      if (
        state.report.authorUid !== expected.authorUid ||
        state.report.photoPath !== expected.photoPath
      ) {
        return 'mismatch';
      }
      if (state.report.status !== 'pending_upload') return 'not_pending';
      state.report.status = 'processing_ai';
      return 'started';
    },
    saveEvaluation: async (_reportId, evaluation) => {
      state.evaluations.push(evaluation);
    },
    finish: async (_reportId, outcome) => {
      state.finished.push(outcome);
      if (state.report) state.report.status = outcome.status;
    },
  };
  return { store, state };
}

/** Clasificador que responde, en orden, cada elemento: una clasificación o un error. */
function scriptedClassifier(script: (Classification | Error)[]) {
  const calls: { bytes: string; timeoutMs: number }[] = [];
  const classifier: Classifier = {
    provider: 'mock',
    model: 'modelo-de-prueba',
    classify: async (photo, options) => {
      calls.push({ bytes: photo.bytes.toString(), timeoutMs: options.timeoutMs });
      const next = script.shift();
      if (!next) throw new Error('el guion no tiene más respuestas');
      if (next instanceof Error) throw next;
      return {
        classification: next,
        rawOutput: JSON.stringify(next),
        tokens: { input: 300, output: 40 },
      };
    },
  };
  return { classifier, calls };
}

function setup(
  options: {
    report?: Parameters<typeof fakeStore>[0];
    script?: (Classification | Error)[];
    config?: Partial<ClassifyDeps['config']>;
    readPhoto?: ClassifyDeps['readPhoto'];
  } = {},
) {
  const pending = { authorUid: UID, photoPath: PHOTO_PATH, status: 'pending_upload' };
  const { store, state } = fakeStore(options.report === undefined ? pending : options.report);
  const { classifier, calls } = scriptedClassifier(options.script ?? [approved]);
  let nowMs = 1_795_000_000_000;
  const slept: number[] = [];
  const deps: ClassifyDeps = {
    store,
    classifier,
    config: { ...config, ...options.config },
    readPhoto: options.readPhoto ?? (async () => Buffer.from('jpeg')),
    // Cada lectura del reloj avanza 100 ms: así la latencia medida no es cero.
    nowMs: () => (nowMs += 100),
    sleep: async (ms) => {
      slept.push(ms);
    },
  };
  return { deps, state, calls, slept };
}

describe('classifyUploadedPhoto · veredicto', () => {
  it('clasifica la foto, guarda la evaluación y escribe el veredicto con ai', async () => {
    const { deps, state, calls } = setup();

    const result = await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(result).toEqual({ outcome: 'decided', reportId: REPORT_ID, status: 'approved' });
    expect(calls).toEqual([{ bytes: 'jpeg', timeoutMs: 15_000 }]);
    expect(state.evaluations).toHaveLength(1);
    expect(state.evaluations[0]).toMatchObject({
      attempt: 1,
      provider: 'mock',
      model: 'modelo-de-prueba',
      promptVersion: 'v1',
      photoPath: PHOTO_PATH,
      classification: approved,
      rawOutput: JSON.stringify(approved),
      error: null,
      tokens: { input: 300, output: 40 },
    });
    expect(state.finished).toEqual([
      {
        status: 'approved',
        reason: null,
        ai: {
          ...approved,
          model: 'modelo-de-prueba',
          promptVersion: 'v1',
          latencyMs: state.evaluations[0].latencyMs,
        },
      },
    ]);
    expect(state.evaluations[0].latencyMs).toBeGreaterThan(0);
  });

  it('sin residuos o con poca confianza rechaza sin intervención humana', async () => {
    const noWaste = setup({ script: [{ ...approved, category: 'sin_residuo' }] });
    const unsure = setup({ script: [{ ...approved, confidence: 0.2 }] });

    expect(await classifyUploadedPhoto(PHOTO_PATH, noWaste.deps)).toMatchObject({
      status: 'rejected',
    });
    expect(await classifyUploadedPhoto(PHOTO_PATH, unsure.deps)).toMatchObject({
      status: 'rejected',
    });
    // El rechazado también queda rastreable (ADR 0004).
    expect(noWaste.state.finished[0].ai?.category).toBe('sin_residuo');
    expect(noWaste.state.evaluations).toHaveLength(1);
  });

  it('con confianza intermedia va a revisión', async () => {
    const { deps } = setup({ script: [{ ...approved, confidence: 0.6 }] });
    expect(await classifyUploadedPhoto(PHOTO_PATH, deps)).toMatchObject({
      status: 'needs_review',
    });
  });
});

describe('classifyUploadedPhoto · fallos de la IA', () => {
  const invalid = new ClassifierError('no cumple el esquema', 'invalid_output', '{"x":1}');

  it('reintenta un error técnico y deja las dos evaluaciones', async () => {
    const { deps, state } = setup({ script: [invalid, approved] });

    const result = await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(result).toMatchObject({ status: 'approved' });
    expect(state.evaluations.map(({ attempt, error }) => [attempt, error?.reason ?? null])).toEqual(
      [
        [1, 'invalid_output'],
        [2, null],
      ],
    );
    expect(state.evaluations[0]).toMatchObject({ classification: null, rawOutput: '{"x":1}' });
  });

  it('si falla en todos los intentos va a revisión con el motivo, nunca queda colgado', async () => {
    const timeout = new ClassifierError('no respondió', 'timeout');
    const { deps, state, calls } = setup({ script: [timeout, timeout, approved] });

    const result = await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(calls).toHaveLength(2); // AI_MAX_ATTEMPTS
    expect(result).toMatchObject({ status: 'needs_review' });
    expect(state.finished).toEqual([{ status: 'needs_review', ai: null, reason: 'ai_failed' }]);
    expect(state.report?.status).toBe('needs_review');
  });

  it('si no se puede leer la foto también termina en revisión', async () => {
    const { deps, state, calls } = setup({
      readPhoto: async () => {
        throw new Error('objeto no encontrado');
      },
    });

    await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(calls).toHaveLength(0);
    expect(state.evaluations[0].error).toEqual({
      reason: 'provider',
      message: 'objeto no encontrado',
    });
    expect(state.finished[0]).toMatchObject({ status: 'needs_review', reason: 'ai_failed' });
  });

  it('si ni la evaluación se puede guardar, el reporte igual sale de processing_ai', async () => {
    const { deps, state } = setup();
    deps.store.saveEvaluation = async () => {
      throw new Error('Firestore no disponible');
    };
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(result).toMatchObject({ status: 'needs_review' });
    expect(state.report?.status).toBe('needs_review');
    jest.restoreAllMocks();
  });

  it('con AI_ENABLED=false va a revisión sin llamar a la IA', async () => {
    const { deps, state, calls } = setup({ config: { aiEnabled: false } });

    await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(calls).toHaveLength(0);
    expect(state.evaluations).toHaveLength(0);
    expect(state.finished).toEqual([{ status: 'needs_review', ai: null, reason: 'ai_disabled' }]);
  });
});

describe('classifyUploadedPhoto · no confía en lo que llegó', () => {
  it('ignora archivos que no son la foto de un reporte', async () => {
    const { deps, state } = setup();

    for (const path of ['thumbs/x.jpg', `reports/${UID}/corto.jpg`, `reports/${UID}/a/b.jpg`]) {
      expect(await classifyUploadedPhoto(path, deps)).toEqual({
        outcome: 'ignored',
        why: 'not_a_report_photo',
      });
    }
    expect(state.startCalls).toBe(0);
  });

  it('no clasifica si el reporte es de otro autor', async () => {
    const report = { authorUid: 'uid-2', photoPath: PHOTO_PATH, status: 'pending_upload' };
    const { deps, calls, state } = setup({ report });

    expect(await classifyUploadedPhoto(PHOTO_PATH, deps)).toEqual({
      outcome: 'ignored',
      why: 'mismatch',
    });
    expect(calls).toHaveLength(0);
    expect(state.report?.status).toBe('pending_upload');
  });

  it('no clasifica un reporte cancelado ni repite uno ya clasificado', async () => {
    for (const status of ['cancelled', 'processing_ai', 'approved']) {
      const { deps, calls } = setup({ report: { authorUid: UID, photoPath: PHOTO_PATH, status } });
      expect(await classifyUploadedPhoto(PHOTO_PATH, deps)).toEqual({
        outcome: 'ignored',
        why: 'not_pending',
      });
      expect(calls).toHaveLength(0);
    }
  });

  it('si la foto llega antes que el documento, lo espera', async () => {
    const { deps, state, slept } = setup({ report: null });
    deps.sleep = async (ms) => {
      slept.push(ms);
      if (slept.length === 2) {
        state.report = { authorUid: UID, photoPath: PHOTO_PATH, status: 'pending_upload' };
      }
    };

    const result = await classifyUploadedPhoto(PHOTO_PATH, deps);

    expect(result).toMatchObject({ outcome: 'decided', status: 'approved' });
    expect(slept).toEqual([REPORT_WAIT_MS, REPORT_WAIT_MS]);
  });

  it('si el documento nunca llega, deja de esperar y no clasifica', async () => {
    const { deps, calls, slept, state } = setup({ report: null });

    expect(await classifyUploadedPhoto(PHOTO_PATH, deps)).toEqual({
      outcome: 'ignored',
      why: 'missing',
    });
    expect(state.startCalls).toBe(REPORT_WAIT_ATTEMPTS);
    expect(slept).toHaveLength(REPORT_WAIT_ATTEMPTS - 1);
    expect(calls).toHaveLength(0);
  });
});
