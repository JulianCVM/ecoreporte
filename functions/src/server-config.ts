import { z } from 'zod';

/**
 * Rangos válidos de los parámetros del servidor. Salen de la tabla «Servidor» de
 * docs/05-parametrizacion.md: si cambia uno, se cambia allá también.
 */
export const SERVER_CONFIG_LIMITS = {
  aiDailyLimit: { min: 1 },
  aiApproveThreshold: { min: 0.5, max: 0.99 },
  aiReviewThreshold: { min: 0.1 },
  aiTimeoutMs: { min: 5_000, max: 60_000 },
  aiMaxAttempts: { min: 1, max: 3 },
  aiMaxInstances: { min: 1, max: 10 },
  reportsPerUserPerDay: { min: 1, max: 100 },
  photoRetentionRejectedDays: { min: 1, max: 365 },
} as const;

/** Quién clasifica la foto (ADR 0007). `vertex` es la producción proyectada. */
export const AI_PROVIDERS = ['mock', 'gemini-api', 'vertex'] as const;
/** Complejidad desde la que se crea una alerta para los operadores (RF03). */
export const ALERT_COMPLEXITIES = ['media', 'alta'] as const;

const limits = SERVER_CONFIG_LIMITS;
const intInRange = (range: { min: number; max?: number }) => {
  const atLeast = z.number().int().min(range.min);
  return range.max === undefined ? atLeast : atLeast.max(range.max);
};
// Firebase no tiene `defineFloat`: los umbrales llegan como texto y aquí se vuelven número.
const threshold = (min: number, max: number) => z.coerce.number().min(min).max(max);

export const serverConfigSchema = z
  .object({
    aiProvider: z.enum(AI_PROVIDERS),
    aiEnabled: z.boolean(),
    geminiModel: z.string().trim().min(1),
    vertexLocation: z.string().trim().min(1),
    aiDailyLimit: intInRange(limits.aiDailyLimit),
    aiApproveThreshold: threshold(limits.aiApproveThreshold.min, limits.aiApproveThreshold.max),
    aiReviewThreshold: threshold(limits.aiReviewThreshold.min, limits.aiApproveThreshold.max),
    aiTimeoutMs: intInRange(limits.aiTimeoutMs),
    aiMaxAttempts: intInRange(limits.aiMaxAttempts),
    aiMaxInstances: intInRange(limits.aiMaxInstances),
    promptVersion: z.string().trim().min(1),
    fcmEnabled: z.boolean(),
    reportsPerUserPerDay: intInRange(limits.reportsPerUserPerDay),
    photoRetentionRejectedDays: intInRange(limits.photoRetentionRejectedDays),
    alertComplexity: z.enum(ALERT_COMPLEXITIES),
  })
  // El umbral de revisión va hasta el de aprobación: si lo pasara, un reporte con confianza
  // intermedia se rechazaría en vez de ir a revisión (regla de veredicto, docs/05).
  .refine((config) => config.aiReviewThreshold <= config.aiApproveThreshold, {
    path: ['aiReviewThreshold'],
    message: 'AI_REVIEW_THRESHOLD no puede ser mayor que AI_APPROVE_THRESHOLD',
  });

/** Configuración del servidor ya validada. */
export type ServerConfig = z.infer<typeof serverConfigSchema>;

/**
 * Valida los parámetros leídos de Firebase. Lanza un error que nombra cada parámetro inválido,
 * para que la función falle al arrancar y no clasifique con un valor fuera de rango.
 */
export function parseServerConfig(raw: unknown): ServerConfig {
  const result = serverConfigSchema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Configuración del servidor inválida → ${problems}`);
}
