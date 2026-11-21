import {
  defineBoolean,
  defineInt,
  defineSecret,
  defineString,
  select,
} from 'firebase-functions/params';

import {
  AI_PROVIDERS,
  ALERT_COMPLEXITIES,
  parseServerConfig,
  type ServerConfig,
} from './server-config';

/**
 * Parámetros de las Cloud Functions (tabla «Servidor» de docs/05-parametrizacion.md).
 *
 * - En local, los valores salen de `functions/.env.local` y los secretos de
 *   `functions/.secret.local` (los dos fuera de git; ver `.env.example`).
 * - En la producción proyectada, de `functions/.env.prod` y de Secret Manager.
 *
 * Los valores por defecto son los de la tabla. `.value()` solo se llama en tiempo de ejecución
 * (dentro de una función), nunca al cargar el módulo: por eso se lee con `readServerConfig()`.
 */

/** Región de Firestore, Storage y Functions; no se puede cambiar después (ADR 0005). */
export const REGION = 'us-east1';

export const params = {
  aiProvider: defineString('AI_PROVIDER', {
    default: 'mock',
    input: select([...AI_PROVIDERS]),
    description: 'Quién clasifica la foto: mock (sin red), gemini-api (capa gratuita) o vertex',
  }),
  aiEnabled: defineBoolean('AI_ENABLED', {
    default: true,
    description: 'false: todos los reportes van a needs_review sin llamar a la IA',
  }),
  // [POR CONFIRMAR] el Gemini Flash vigente al integrar la IA (#11).
  geminiModel: defineString('GEMINI_MODEL', { default: 'gemini-2.5-flash' }),
  vertexLocation: defineString('VERTEX_LOCATION', { default: REGION }),
  aiDailyLimit: defineInt('AI_DAILY_LIMIT', {
    default: 200,
    description: 'Tope global de llamadas a la IA por día, por debajo de la cuota gratuita',
  }),
  aiApproveThreshold: defineString('AI_APPROVE_THRESHOLD', { default: '0.80' }),
  aiReviewThreshold: defineString('AI_REVIEW_THRESHOLD', { default: '0.50' }),
  aiTimeoutMs: defineInt('AI_TIMEOUT_MS', { default: 15_000 }),
  aiMaxAttempts: defineInt('AI_MAX_ATTEMPTS', { default: 2 }),
  aiMaxInstances: defineInt('AI_MAX_INSTANCES', { default: 3 }),
  promptVersion: defineString('PROMPT_VERSION', { default: 'v1' }),
  fcmEnabled: defineBoolean('FCM_ENABLED', {
    default: false,
    description: 'Enviar push desde la función; en local necesita la credencial opcional',
  }),
  reportsPerUserPerDay: defineInt('REPORTS_PER_USER_PER_DAY', { default: 10 }),
  photoRetentionRejectedDays: defineInt('PHOTO_RETENTION_REJECTED_DAYS', { default: 30 }),
  alertComplexity: defineString('ALERT_COMPLEXITY', {
    default: 'alta',
    input: select([...ALERT_COMPLEXITIES]),
  }),
};

/** Clave de la capa gratuita de Gemini; solo se usa con `AI_PROVIDER=gemini-api`. */
export const geminiApiKey = defineSecret('GEMINI_API_KEY');

/** Lee todos los parámetros y los valida. Se llama dentro de cada función, no al cargar. */
export function readServerConfig(): ServerConfig {
  const raw = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [key, param.value()]),
  );
  return parseServerConfig(raw);
}
