import type { Actor, ReportStatus } from './types';

/**
 * Máquina de estados del reporte (docs/02-arquitectura.md).
 * Las reglas de Firestore repiten estas transiciones: si cambias una, cambia la otra
 * y su prueba.
 */
const TRANSITIONS: Record<Actor, Partial<Record<ReportStatus, readonly ReportStatus[]>>> = {
  author: {
    pending_upload: ['cancelled'],
  },
  operator: {
    needs_review: ['approved', 'rejected'],
    approved: ['in_progress'],
    in_progress: ['resolved'],
  },
  system: {
    pending_upload: ['processing_ai', 'cancelled'],
    processing_ai: ['approved', 'needs_review', 'rejected'],
  },
};

export function canTransition(actor: Actor, from: ReportStatus, to: ReportStatus): boolean {
  return TRANSITIONS[actor][from]?.includes(to) ?? false;
}

export function nextStatuses(actor: Actor, from: ReportStatus): readonly ReportStatus[] {
  return TRANSITIONS[actor][from] ?? [];
}

/** Estados que ve cualquier usuario con sesión en el mapa. */
const PUBLIC_STATUSES: readonly ReportStatus[] = ['approved', 'in_progress', 'resolved'];

export function isPublic(status: ReportStatus): boolean {
  return PUBLIC_STATUSES.includes(status);
}

/** Estados en los que el autor ya puede ver un veredicto, de la IA o del operador. */
export function hasVerdict(status: ReportStatus): boolean {
  return status !== 'pending_upload' && status !== 'processing_ai' && status !== 'cancelled';
}

/** Estados finales: el reporte ya no cambia. */
export function isFinal(status: ReportStatus): boolean {
  return status === 'resolved' || status === 'rejected' || status === 'cancelled';
}
