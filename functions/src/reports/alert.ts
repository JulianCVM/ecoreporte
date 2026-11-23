import { COMPLEXITIES, type Classification } from '../ai/classification';
import type { ServerConfig } from '../server-config';
import type { Verdict } from './verdict';

/**
 * RF03: ¿este veredicto crea una alerta para los operadores?
 *
 * Se alerta cuando la complejidad llega a `ALERT_COMPLEXITY` y el reporte no fue rechazado:
 * un rechazado no tiene residuos que atender. Sin clasificación no hay complejidad que medir.
 */
export function shouldAlert(
  status: Verdict,
  classification: Pick<Classification, 'complexity'> | null,
  alertComplexity: ServerConfig['alertComplexity'],
): boolean {
  if (status === 'rejected' || !classification) return false;
  return COMPLEXITIES.indexOf(classification.complexity) >= COMPLEXITIES.indexOf(alertComplexity);
}
