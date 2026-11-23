import type { GenerateContentParameters } from '@google/genai';

import { classificationJsonSchema, parseClassificationText } from './classification';
import {
  ClassifierError,
  type AiProvider,
  type Classifier,
  type ClassifierOutput,
  type PhotoInput,
} from './classifier';

/** Lo que este clasificador usa de la respuesta de `@google/genai`. */
export type GeminiResponse = {
  text?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

/** `client.models.generateContent`, inyectable para probar sin red. */
export type GenerateContent = (params: GenerateContentParameters) => Promise<GeminiResponse>;

type GeminiClassifierDeps = {
  provider: Extract<AiProvider, 'gemini-api' | 'vertex'>;
  model: string;
  prompt: string;
  generateContent: GenerateContent;
};

// Se compara el nombre y no la clase: lo que lanza `AbortSignal.timeout` es un `DOMException`,
// que no siempre pasa un `instanceof Error`.
const isTimeout = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  (error.name === 'TimeoutError' || error.name === 'AbortError');

/**
 * Clasificador con Gemini y salida estructurada (ADR 0003). Sirve para la Developer API
 * (`gemini-api`, capa gratuita) y para Vertex AI (`vertex`, producción proyectada): solo cambia
 * el cliente que se le inyecta.
 */
export class GeminiClassifier implements Classifier {
  readonly provider: GeminiClassifierDeps['provider'];
  readonly model: string;

  constructor(private readonly deps: GeminiClassifierDeps) {
    this.provider = deps.provider;
    this.model = deps.model;
  }

  async classify(
    photo: PhotoInput,
    { timeoutMs }: { timeoutMs: number },
  ): Promise<ClassifierOutput> {
    let response: GeminiResponse;
    try {
      response = await this.deps.generateContent({
        model: this.deps.model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: photo.mimeType, data: photo.bytes.toString('base64') } },
              { text: this.deps.prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: classificationJsonSchema,
          // Clasificar no es una tarea creativa: la misma foto debe dar la misma respuesta.
          temperature: 0,
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
    } catch (error) {
      if (isTimeout(error)) {
        throw new ClassifierError(`La IA no respondió en ${timeoutMs} ms`, 'timeout', null, {
          cause: error,
        });
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new ClassifierError(`El proveedor de IA falló: ${detail}`, 'provider', null, {
        cause: error,
      });
    }

    const rawOutput = response.text ?? '';
    const parsed = parseClassificationText(rawOutput);
    if (!parsed.ok) {
      throw new ClassifierError(
        `La IA respondió algo que no cumple el esquema: ${parsed.problem}`,
        'invalid_output',
        rawOutput,
      );
    }
    return {
      classification: parsed.classification,
      rawOutput,
      tokens: {
        input: response.usageMetadata?.promptTokenCount ?? null,
        output: response.usageMetadata?.candidatesTokenCount ?? null,
      },
    };
  }
}
