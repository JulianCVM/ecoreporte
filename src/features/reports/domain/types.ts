/** Valores cerrados del dominio (docs/03-modelo-de-datos.md). */
export const REPORT_STATUSES = [
  'pending_upload',
  'processing_ai',
  'approved',
  'needs_review',
  'rejected',
  'in_progress',
  'resolved',
  'cancelled',
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const WASTE_CATEGORIES = [
  'via_publica',
  'domiciliario_ilegal',
  'escombros',
  'sin_residuo',
] as const;
export type WasteCategory = (typeof WASTE_CATEGORIES)[number];

export const COMPLEXITIES = ['baja', 'media', 'alta'] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

/** Quién intenta mover el estado. `system` = Cloud Function con Admin SDK. */
export type Actor = 'author' | 'operator' | 'system';
