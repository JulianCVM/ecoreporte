import { parseServerConfig } from '../server-config';

/** Valores por defecto de la tabla «Servidor» de docs/05, como los entrega Firebase. */
const defaults = {
  aiProvider: 'mock',
  aiEnabled: true,
  geminiModel: 'gemini-2.5-flash',
  vertexLocation: 'us-east1',
  aiDailyLimit: 200,
  aiApproveThreshold: '0.80',
  aiReviewThreshold: '0.50',
  aiTimeoutMs: 15_000,
  aiMaxAttempts: 2,
  aiMaxInstances: 3,
  promptVersion: 'v1',
  fcmEnabled: false,
  reportsPerUserPerDay: 10,
  photoRetentionRejectedDays: 30,
  alertComplexity: 'alta',
};

describe('parseServerConfig', () => {
  it('acepta los valores por defecto y convierte los umbrales en número', () => {
    const config = parseServerConfig(defaults);
    expect(config.aiApproveThreshold).toBe(0.8);
    expect(config.aiReviewThreshold).toBe(0.5);
  });

  it('rechaza un proveedor de IA desconocido', () => {
    expect(() => parseServerConfig({ ...defaults, aiProvider: 'openai' })).toThrow('aiProvider');
  });

  it('rechaza un umbral que no es número', () => {
    expect(() => parseServerConfig({ ...defaults, aiApproveThreshold: 'alto' })).toThrow(
      'aiApproveThreshold',
    );
  });

  it('rechaza un umbral de revisión mayor que el de aprobación', () => {
    expect(() =>
      parseServerConfig({ ...defaults, aiApproveThreshold: '0.6', aiReviewThreshold: '0.7' }),
    ).toThrow('AI_REVIEW_THRESHOLD no puede ser mayor que AI_APPROVE_THRESHOLD');
  });

  it('acepta umbrales iguales: no queda franja de revisión, pero la regla sigue siendo coherente', () => {
    const config = parseServerConfig({
      ...defaults,
      aiApproveThreshold: '0.7',
      aiReviewThreshold: '0.7',
    });
    expect(config.aiReviewThreshold).toBe(0.7);
  });

  it.each([
    ['aiTimeoutMs', 4_999],
    ['aiTimeoutMs', 60_001],
    ['aiMaxAttempts', 0],
    ['aiMaxAttempts', 4],
    ['aiMaxInstances', 11],
    ['reportsPerUserPerDay', 101],
    ['photoRetentionRejectedDays', 0],
    ['aiDailyLimit', 0],
    ['aiApproveThreshold', '0.995'],
    ['aiReviewThreshold', '0.05'],
  ])('rechaza %s = %p fuera del rango de docs/05', (key, value) => {
    expect(() => parseServerConfig({ ...defaults, [key]: value })).toThrow(key);
  });

  it('nombra todos los parámetros inválidos en un solo error', () => {
    expect(() =>
      parseServerConfig({ ...defaults, aiMaxAttempts: 9, alertComplexity: 'baja' }),
    ).toThrow(/aiMaxAttempts.*alertComplexity/);
  });
});
