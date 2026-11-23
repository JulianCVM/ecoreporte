import type { AI_PROVIDERS } from '../server-config';
import type { Classification } from './classification';

export type AiProvider = (typeof AI_PROVIDERS)[number];

/** Foto ya leída de Storage. Las reglas solo dejan subir JPEG. */
export type PhotoInput = { bytes: Buffer; mimeType: 'image/jpeg' };

export type ClassifierOutput = {
  classification: Classification;
  /** Texto tal como lo devolvió el modelo; va a `evaluations` para auditar. */
  rawOutput: string;
  /** Tokens que consumió la llamada; `null` si el proveedor no los informa. */
  tokens: { input: number | null; output: number | null };
};

/** Por qué falló una clasificación. Las tres cuentan como error técnico (ADR 0003). */
export type ClassifierFailure = 'invalid_output' | 'timeout' | 'provider';

/** Error técnico de la IA: `classifyReportPhoto` lo reintenta o manda el reporte a revisión. */
export class ClassifierError extends Error {
  constructor(
    message: string,
    readonly reason: ClassifierFailure,
    /** Lo que alcanzó a responder el modelo, si respondió algo. */
    readonly rawOutput: string | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ClassifierError';
  }
}

/**
 * Frontera de la IA (ADR 0007). `AI_PROVIDER` elige la implementación; el resto del código
 * solo conoce esta interfaz.
 *
 * Una implementación clasifica y valida la respuesta. No decide el veredicto ni escribe en
 * Firestore.
 */
export interface Classifier {
  readonly provider: AiProvider;
  /** Nombre del modelo, para guardarlo en cada evaluación. */
  readonly model: string;
  /**
   * @throws ClassifierError si el proveedor falla, tarda más de `timeoutMs` o responde algo
   * que no cumple el esquema.
   */
  classify(photo: PhotoInput, options: { timeoutMs: number }): Promise<ClassifierOutput>;
}
