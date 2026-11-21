import { params, readServerConfig } from '../config';

// En tiempo de ejecución, `param.value()` solo lee process.env: el `default` lo resuelve el CLI
// de Firebase (emulador o deploy) y lo inyecta en el entorno. Aquí se hace lo mismo a mano.
const originalEnv = { ...process.env };

/** Simula al CLI: cada parámetro toma su valor por defecto, salvo los que se reemplazan. */
function injectParams(overrides: Record<string, string> = {}) {
  for (const param of Object.values(params)) {
    process.env[param.name] = String(param.options.default);
  }
  Object.assign(process.env, overrides);
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('readServerConfig', () => {
  it('los valores por defecto declarados cumplen los rangos de docs/05', () => {
    injectParams();
    expect(readServerConfig()).toMatchObject({
      aiProvider: 'mock',
      aiEnabled: true,
      aiApproveThreshold: 0.8,
      aiReviewThreshold: 0.5,
      fcmEnabled: false,
      alertComplexity: 'alta',
    });
  });

  it('usa los valores de functions/.env.local cuando existen', () => {
    injectParams({ AI_PROVIDER: 'gemini-api', AI_APPROVE_THRESHOLD: '0.9' });
    expect(readServerConfig()).toMatchObject({ aiProvider: 'gemini-api', aiApproveThreshold: 0.9 });
  });

  it('falla si un valor del entorno está fuera de rango', () => {
    injectParams({ AI_MAX_ATTEMPTS: '7' });
    expect(() => readServerConfig()).toThrow('aiMaxAttempts');
  });

  it('falla si el CLI no inyectó los parámetros, en vez de usar ceros y textos vacíos', () => {
    process.env = {};
    expect(() => readServerConfig()).toThrow('Configuración del servidor inválida');
  });

  it('declara los 15 parámetros de la tabla «Servidor», además del secreto', () => {
    const names = Object.values(params).map((param) => param.name);
    expect(new Set(names).size).toBe(15);
    expect(names).toEqual(
      expect.arrayContaining(['AI_PROVIDER', 'AI_DAILY_LIMIT', 'ALERT_COMPLEXITY', 'FCM_ENABLED']),
    );
  });
});
