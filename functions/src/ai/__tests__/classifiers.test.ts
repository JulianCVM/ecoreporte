import type { GenerateContentParameters } from '@google/genai';

import { classificationJsonSchema, classificationSchema } from '../classification';
import { ClassifierError, type PhotoInput } from '../classifier';
import { createClassifier } from '../create-classifier';
import { GeminiClassifier, type GeminiResponse } from '../gemini-classifier';
import { MOCK_CLASSIFICATIONS, MockClassifier } from '../mock-classifier';
import { classificationPrompt } from '../prompt';

const photo = (content: string): PhotoInput => ({
  bytes: Buffer.from(content),
  mimeType: 'image/jpeg',
});
const options = { timeoutMs: 15_000 };

describe('MockClassifier', () => {
  const classifier = new MockClassifier();

  it('la misma foto recibe siempre la misma respuesta', async () => {
    const first = await classifier.classify(photo('foto-a'));
    const second = await classifier.classify(photo('foto-a'));
    expect(second).toEqual(first);
  });

  it('todas sus respuestas cumplen el esquema que se le exige a la IA real', () => {
    for (const classification of MOCK_CLASSIFICATIONS) {
      expect(classificationSchema.safeParse(classification).success).toBe(true);
    }
  });

  it('fotos distintas recorren más de un caso', async () => {
    const outputs = await Promise.all(
      Array.from({ length: 40 }, (_, index) => classifier.classify(photo(`foto-${index}`))),
    );
    const summaries = new Set(outputs.map((output) => output.classification.summary));
    expect(summaries.size).toBeGreaterThan(1);
  });
});

describe('GeminiClassifier', () => {
  const valid = MOCK_CLASSIFICATIONS[1];

  function geminiWith(respond: (params: GenerateContentParameters) => Promise<GeminiResponse>) {
    const calls: GenerateContentParameters[] = [];
    const classifier = new GeminiClassifier({
      provider: 'gemini-api',
      model: 'gemini-de-prueba',
      prompt: 'PROMPT',
      generateContent: (params) => {
        calls.push(params);
        return respond(params);
      },
    });
    return { classifier, calls };
  }

  const failure = async (promise: Promise<unknown>): Promise<ClassifierError> => {
    const error = await promise.then(
      () => null,
      (caught: unknown) => caught,
    );
    if (!(error instanceof ClassifierError)) throw new Error('se esperaba un ClassifierError');
    return error;
  };

  it('manda la foto, el prompt y el esquema, y devuelve la clasificación con sus tokens', async () => {
    const { classifier, calls } = geminiWith(async () => ({
      text: JSON.stringify(valid),
      usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 40 },
    }));

    const output = await classifier.classify(photo('jpeg'), options);

    expect(output).toEqual({
      classification: valid,
      rawOutput: JSON.stringify(valid),
      tokens: { input: 300, output: 40 },
    });
    expect(calls[0]).toMatchObject({
      model: 'gemini-de-prueba',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: Buffer.from('jpeg').toString('base64'),
              },
            },
            { text: 'PROMPT' },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: classificationJsonSchema,
        temperature: 0,
      },
    });
  });

  it('una salida que no cumple el esquema es un error técnico que conserva lo que dijo', async () => {
    const raw = JSON.stringify({ ...valid, category: 'chatarra' });
    const { classifier } = geminiWith(async () => ({ text: raw }));

    const error = await failure(classifier.classify(photo('jpeg'), options));

    expect(error).toMatchObject({ reason: 'invalid_output', rawOutput: raw });
  });

  it('una respuesta sin texto también es salida inválida', async () => {
    const { classifier } = geminiWith(async () => ({}));
    expect((await failure(classifier.classify(photo('jpeg'), options))).reason).toBe(
      'invalid_output',
    );
  });

  it('un fallo del proveedor se reporta con su mensaje', async () => {
    const { classifier } = geminiWith(async () => {
      throw new Error('429 quota exceeded');
    });

    const error = await failure(classifier.classify(photo('jpeg'), options));

    expect(error.reason).toBe('provider');
    expect(error.message).toContain('429 quota exceeded');
  });

  it('corta la llamada al pasar AI_TIMEOUT_MS', async () => {
    const { classifier } = geminiWith(
      ({ config }) =>
        new Promise((_resolve, reject) => {
          config?.abortSignal?.addEventListener('abort', () => reject(config.abortSignal?.reason));
        }),
    );

    const error = await failure(classifier.classify(photo('jpeg'), { timeoutMs: 20 }));

    expect(error.reason).toBe('timeout');
  });
});

describe('createClassifier', () => {
  const config = {
    aiProvider: 'mock',
    geminiModel: 'gemini-de-prueba',
    vertexLocation: 'us-east1',
    promptVersion: 'v1',
  } as const;
  const noKey = () => {
    throw new Error('mock no debe leer la clave');
  };

  it('con mock no lee la clave ni necesita proyecto', () => {
    const classifier = createClassifier(config, { geminiApiKey: noKey, projectId: undefined });
    expect(classifier).toBeInstanceOf(MockClassifier);
  });

  it('con gemini-api usa el modelo configurado', () => {
    const classifier = createClassifier(
      { ...config, aiProvider: 'gemini-api' },
      { geminiApiKey: () => 'clave-falsa-de-prueba', projectId: undefined },
    );
    expect(classifier).toMatchObject({ provider: 'gemini-api', model: 'gemini-de-prueba' });
  });

  it('con gemini-api y sin clave falla al arrancar', () => {
    expect(() =>
      createClassifier(
        { ...config, aiProvider: 'gemini-api' },
        { geminiApiKey: () => '  ', projectId: undefined },
      ),
    ).toThrow(/GEMINI_API_KEY/);
  });

  it('con vertex y sin proyecto falla al arrancar', () => {
    expect(() =>
      createClassifier(
        { ...config, aiProvider: 'vertex' },
        { geminiApiKey: noKey, projectId: undefined },
      ),
    ).toThrow(/proyecto/);
  });

  it('una PROMPT_VERSION desconocida falla y dice cuáles existen', () => {
    expect(() => classificationPrompt('v9')).toThrow(/v9.*v1/);
    expect(() =>
      createClassifier(
        { ...config, aiProvider: 'gemini-api', promptVersion: 'v9' },
        { geminiApiKey: () => 'clave-falsa-de-prueba', projectId: undefined },
      ),
    ).toThrow(/PROMPT_VERSION/);
  });
});
