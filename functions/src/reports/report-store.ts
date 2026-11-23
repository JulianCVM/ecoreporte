import type { Classification } from '../ai/classification';
import type { ClassifierFailure } from '../ai/classifier';
import type { ReviewReason, Verdict } from './verdict';

/** Resultado de intentar tomar un reporte para clasificarlo. */
export type StartResult =
  /** Pasó de `pending_upload` a `processing_ai`: esta ejecución es la dueña. */
  | 'started'
  /** El documento no existe (todavía). */
  | 'missing'
  /** Ya no está en `pending_upload`: cancelado, o lo tomó otra ejecución. */
  | 'not_pending'
  /** El autor o la ruta de la foto no coinciden con los del documento. */
  | 'mismatch';

/** Una llamada a la IA, tal como queda en `reports/{id}/evaluations` (docs/03). */
export type Evaluation = {
  attempt: number;
  provider: string;
  model: string;
  promptVersion: string;
  photoPath: string;
  /** Salida validada; `null` si la llamada falló. */
  classification: Classification | null;
  /** Texto crudo del modelo; `null` si no alcanzó a responder. */
  rawOutput: string | null;
  error: { reason: ClassifierFailure; message: string } | null;
  latencyMs: number;
  tokens: { input: number | null; output: number | null };
  atMs: number;
};

/** Campo `ai` del reporte: la clasificación más con qué y cuándo se hizo (docs/03). */
export type AiResult = Classification & {
  model: string;
  promptVersion: string;
  latencyMs: number;
};

export type FinalOutcome = {
  status: Verdict;
  /** `null` si no hubo clasificación válida. */
  ai: AiResult | null;
  /** Motivo de la revisión cuando no la decidió la IA; `null` en los demás casos. */
  reason: ReviewReason | null;
};

/**
 * Lo que `classifyUploadedPhoto` necesita de Firestore. Es una interfaz para probar la
 * orquestación sin emulador; la implementación real es `FirestoreReportStore`.
 */
export interface ReportStore {
  /**
   * Toma el reporte en una transacción: comprueba dueño, foto y estado, y lo pasa a
   * `processing_ai`. La transacción evita que dos ejecuciones clasifiquen la misma foto.
   */
  startProcessing(
    reportId: string,
    expected: { authorUid: string; photoPath: string },
    atMs: number,
  ): Promise<StartResult>;
  saveEvaluation(reportId: string, evaluation: Evaluation): Promise<void>;
  /** Escribe el veredicto: estado final del sistema, `ai` y el rastro en `statusHistory`. */
  finish(reportId: string, outcome: FinalOutcome, atMs: number): Promise<void>;
}
