import { ClassifierError, type Classifier, type ClassifierOutput } from '../ai/classifier';
import type { ServerConfig } from '../server-config';
import type { AiResult, Evaluation, FinalOutcome, ReportStore } from './report-store';
import { usageDay } from './usage-limits';
import { decideVerdict, type ReviewReason } from './verdict';

/** Ruta de la foto de un reporte; la misma forma que exige `storage.rules`. */
const PHOTO_PATH_PATTERN = /^reports\/([^/]+)\/([A-Za-z0-9]{20})\.jpg$/;

// La app escribe el documento y sube la foto por separado, así que la foto puede llegar antes
// de que el documento se sincronice. Se espera hasta 5 s antes de darla por huérfana.
export const REPORT_WAIT_ATTEMPTS = 5;
export const REPORT_WAIT_MS = 1_000;

type ClassifyConfig = Pick<
  ServerConfig,
  | 'aiEnabled'
  | 'aiDailyLimit'
  | 'reportsPerUserPerDay'
  | 'aiMaxAttempts'
  | 'aiTimeoutMs'
  | 'aiApproveThreshold'
  | 'aiReviewThreshold'
  | 'promptVersion'
>;

export type ClassifyDeps = {
  store: ReportStore;
  classifier: Classifier;
  config: ClassifyConfig;
  /** Lee la foto de Storage. */
  readPhoto: (path: string) => Promise<Buffer>;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type ClassifyResult =
  | { outcome: 'ignored'; why: 'not_a_report_photo' | 'missing' | 'not_pending' | 'mismatch' }
  | { outcome: 'decided'; reportId: string; status: FinalOutcome['status'] };

function toEvaluation(
  base: Pick<Evaluation, 'attempt' | 'provider' | 'model' | 'promptVersion' | 'photoPath'>,
  result: { output: ClassifierOutput } | { error: unknown },
  timing: { latencyMs: number; atMs: number },
): Evaluation {
  if ('output' in result) {
    const { classification, rawOutput, tokens } = result.output;
    return { ...base, ...timing, classification, rawOutput, tokens, error: null };
  }
  const { error } = result;
  const known = error instanceof ClassifierError;
  return {
    ...base,
    ...timing,
    classification: null,
    rawOutput: known ? error.rawOutput : null,
    tokens: { input: null, output: null },
    error: {
      // Un error que no vino del clasificador (por ejemplo, al leer la foto) también es técnico.
      reason: known ? error.reason : 'provider',
      message: error instanceof Error ? error.message : String(error),
    },
  };
}

/**
 * Llama a la IA hasta `AI_MAX_ATTEMPTS` veces y deja cada intento en `evaluations`.
 *
 * Antes de cada intento reserva una llamada en `AI_DAILY_LIMIT`: los reintentos también
 * gastan cuota.
 *
 * @returns El campo `ai` del reporte, o por qué no hay clasificación.
 */
async function classifyWithRetries(
  reportId: string,
  photoPath: string,
  deps: ClassifyDeps,
): Promise<AiResult | Extract<ReviewReason, 'ai_failed' | 'ai_daily_limit'>> {
  const { classifier, config, store } = deps;
  const base = {
    provider: classifier.provider,
    model: classifier.model,
    promptVersion: config.promptVersion,
    photoPath,
  };
  let bytes: Buffer | null = null;
  for (let attempt = 1; attempt <= config.aiMaxAttempts; attempt += 1) {
    if (!(await store.reserveAiCall(usageDay(deps.nowMs()), config.aiDailyLimit))) {
      // Sin cupo antes del primer intento es el tope; a mitad de los reintentos, la IA falló.
      return attempt === 1 ? 'ai_daily_limit' : 'ai_failed';
    }
    let startedAtMs = deps.nowMs();
    const timing = () => ({ latencyMs: deps.nowMs() - startedAtMs, atMs: deps.nowMs() });
    try {
      bytes ??= await deps.readPhoto(photoPath);
      // RNF01 mide la IA: el reloj arranca después de descargar la foto.
      startedAtMs = deps.nowMs();
      const output = await classifier.classify(
        { bytes, mimeType: 'image/jpeg' },
        { timeoutMs: config.aiTimeoutMs },
      );
      const evaluation = toEvaluation({ ...base, attempt }, { output }, timing());
      await store.saveEvaluation(reportId, evaluation);
      return {
        ...output.classification,
        model: classifier.model,
        promptVersion: config.promptVersion,
        // RNF01: la latencia se mide dentro de la función.
        latencyMs: evaluation.latencyMs,
      };
    } catch (error) {
      await store.saveEvaluation(reportId, toEvaluation({ ...base, attempt }, { error }, timing()));
    }
  }
  return 'ai_failed';
}

/**
 * Decide qué pasa con un reporte ya tomado. Los topes van antes que la IA: un reporte que no
 * se va a clasificar no gasta cuota.
 */
async function decideOutcome(
  reportId: string,
  authorUid: string,
  photoPath: string,
  deps: ClassifyDeps,
): Promise<FinalOutcome> {
  const { store, config } = deps;
  const review = (reason: ReviewReason): FinalOutcome => ({
    status: 'needs_review',
    ai: null,
    reason,
  });
  const withinUserLimit = await store.countUserReport(
    authorUid,
    usageDay(deps.nowMs()),
    config.reportsPerUserPerDay,
  );
  if (!withinUserLimit) return review('user_daily_limit');
  if (!config.aiEnabled) return review('ai_disabled');

  const result = await classifyWithRetries(reportId, photoPath, deps);
  if (typeof result === 'string') return review(result);
  return { status: decideVerdict(result, config), ai: result, reason: null };
}

/**
 * Clasifica la foto recién subida de un reporte y escribe el veredicto (RF02, RF04, ADR 0004).
 *
 * No confía en el cliente: comprueba que la ruta sea de un reporte, que el documento exista,
 * que sea del mismo autor y que siga en `pending_upload`. Una vez en `processing_ai`, el
 * reporte siempre termina en un estado: si la IA está apagada o falla, o se alcanzó un tope
 * de uso (RNF05), va a `needs_review` con el motivo.
 *
 * @param photoPath Ruta del objeto en Storage (`reports/{uid}/{reportId}.jpg`).
 */
export async function classifyUploadedPhoto(
  photoPath: string,
  deps: ClassifyDeps,
): Promise<ClassifyResult> {
  const match = PHOTO_PATH_PATTERN.exec(photoPath);
  if (!match) return { outcome: 'ignored', why: 'not_a_report_photo' };
  const [, authorUid, reportId] = match;
  const { store } = deps;

  let started = await store.startProcessing(reportId, { authorUid, photoPath }, deps.nowMs());
  for (let wait = 1; started === 'missing' && wait < REPORT_WAIT_ATTEMPTS; wait += 1) {
    await deps.sleep(REPORT_WAIT_MS);
    started = await store.startProcessing(reportId, { authorUid, photoPath }, deps.nowMs());
  }
  if (started !== 'started') return { outcome: 'ignored', why: started };

  const outcome = await decideOutcome(reportId, authorUid, photoPath, deps).catch(
    (error: unknown): FinalOutcome => {
      // Falló algo fuera de la IA (un contador, una evaluación): el reporte no puede quedarse
      // colgado en processing_ai.
      console.error(`[classify] ${reportId}: falló la clasificación`, error);
      return { status: 'needs_review', ai: null, reason: 'ai_failed' };
    },
  );

  await store.finish(reportId, outcome, deps.nowMs());
  return { outcome: 'decided', reportId, status: outcome.status };
}
