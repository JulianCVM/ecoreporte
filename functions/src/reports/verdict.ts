import type { Classification } from '../ai/classification';
import type { ServerConfig } from '../server-config';

/** Estados a los que el sistema puede llevar un reporte después de la IA (RF02). */
export type Verdict = 'approved' | 'needs_review' | 'rejected';

/** Por qué un reporte fue a revisión sin veredicto de la IA (regla 5 de docs/05). */
export type ReviewReason =
  | 'ai_failed'
  | 'ai_disabled'
  /** Se alcanzó `AI_DAILY_LIMIT`: no quedan llamadas a la IA hoy. */
  | 'ai_daily_limit'
  /** El autor pasó de `REPORTS_PER_USER_PER_DAY`. */
  | 'user_daily_limit';

type Thresholds = Pick<ServerConfig, 'aiApproveThreshold' | 'aiReviewThreshold'>;

/**
 * Regla de veredicto (docs/05-parametrizacion.md). La decide el servidor con umbrales
 * parametrizados, no el modelo (ADR 0003):
 *
 * 1. `sin_residuo` → `rejected`, sin importar la confianza.
 * 2. Confianza ≥ `AI_APPROVE_THRESHOLD` → `approved`.
 * 3. Confianza ≥ `AI_REVIEW_THRESHOLD` → `needs_review`.
 * 4. Si no → `rejected`.
 */
export function decideVerdict(
  classification: Pick<Classification, 'category' | 'confidence'>,
  thresholds: Thresholds,
): Verdict {
  if (classification.category === 'sin_residuo') return 'rejected';
  if (classification.confidence >= thresholds.aiApproveThreshold) return 'approved';
  if (classification.confidence >= thresholds.aiReviewThreshold) return 'needs_review';
  return 'rejected';
}
