import { GoogleGenAI } from '@google/genai';

import type { ServerConfig } from '../server-config';
import type { Classifier } from './classifier';
import { GeminiClassifier } from './gemini-classifier';
import { MockClassifier } from './mock-classifier';
import { classificationPrompt } from './prompt';

type ClassifierEnvironment = {
  /** Lee `GEMINI_API_KEY`. Solo se llama con `gemini-api`: los otros proveedores no la usan. */
  geminiApiKey: () => string;
  /** Proyecto de Google Cloud; solo lo usa `vertex`. */
  projectId: string | undefined;
};

type ClassifierConfig = Pick<
  ServerConfig,
  'aiProvider' | 'geminiModel' | 'vertexLocation' | 'promptVersion'
>;

/**
 * Crea el clasificador que pide `AI_PROVIDER` (ADR 0007).
 *
 * @throws Error si falta la clave de `gemini-api`, el proyecto de `vertex` o el prompt de
 * `PROMPT_VERSION`: una configuración incompleta falla al arrancar, no en mitad de una foto.
 */
export function createClassifier(config: ClassifierConfig, env: ClassifierEnvironment): Classifier {
  if (config.aiProvider === 'mock') return new MockClassifier();

  const prompt = classificationPrompt(config.promptVersion);
  if (config.aiProvider === 'gemini-api') {
    const apiKey = env.geminiApiKey().trim();
    if (!apiKey) throw new Error('AI_PROVIDER=gemini-api necesita el secreto GEMINI_API_KEY');
    const client = new GoogleGenAI({ apiKey });
    return new GeminiClassifier({
      provider: 'gemini-api',
      model: config.geminiModel,
      prompt,
      generateContent: (params) => client.models.generateContent(params),
    });
  }

  // Producción proyectada (ADR 0007): Vertex AI con la identidad de la cuenta de servicio,
  // sin claves. Exige el plan Blaze, así que no se ha ejecutado.
  if (!env.projectId) throw new Error('AI_PROVIDER=vertex necesita el ID del proyecto');
  const client = new GoogleGenAI({
    vertexai: true,
    project: env.projectId,
    location: config.vertexLocation,
  });
  return new GeminiClassifier({
    provider: 'vertex',
    model: config.geminiModel,
    prompt,
    generateContent: (params) => client.models.generateContent(params),
  });
}
