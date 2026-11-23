import { nextStatuses } from '@/features/reports/domain/report-status';
import type { ReportStatus } from '@/features/reports/domain/types';

/** Estados en los que un reporte espera algo del operador (RF07). */
export const INBOX_STATUSES = [
  'needs_review',
  'approved',
  'in_progress',
] as const satisfies readonly ReportStatus[];

export type OperatorAction = {
  to: ReportStatus;
  /** Texto del botón. */
  label: string;
  /** Pregunta de confirmación: un cambio de estado no se puede deshacer. */
  confirmation: string;
};

const ACTION_TEXTS: Partial<Record<ReportStatus, Omit<OperatorAction, 'to'>>> = {
  approved: { label: 'Aprobar', confirmation: '¿Aprobar el reporte? Aparecerá en el mapa.' },
  rejected: { label: 'Rechazar', confirmation: '¿Rechazar el reporte? No se puede deshacer.' },
  in_progress: { label: 'Empezar la atención', confirmation: '¿Marcar el reporte en atención?' },
  resolved: {
    label: 'Marcar como resuelto',
    confirmation: '¿Los residuos ya se recogieron? No se puede deshacer.',
  },
};

/**
 * Lo que el operador puede hacer con un reporte en `status`. Sale de la máquina de estados
 * (`nextStatuses`), que es la misma que hacen cumplir las reglas de Firestore.
 */
export function operatorActions(status: ReportStatus): OperatorAction[] {
  return nextStatuses('operator', status).flatMap((to) => {
    const texts = ACTION_TEXTS[to];
    return texts ? [{ to, ...texts }] : [];
  });
}
