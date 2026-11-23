import { z } from 'zod';

import { REPORT_STATUSES, type ReportStatus } from './types';

/** Lo que «Mis reportes» muestra de cada reporte (RF06). */
export type MyReport = {
  id: string;
  status: ReportStatus;
  /** Hora del teléfono al tomar la foto (epoch en ms). */
  capturedAtMs: number;
  note: string | null;
  /** Ruta de la foto en Storage; `null` si el documento no la trae. */
  photoPath: string | null;
};

/** Un `Timestamp` de Firestore, sin importar el SDK: al dominio le basta `toMillis()`. */
type TimestampLike = { toMillis: () => number };

const isTimestampLike = (value: unknown): value is TimestampLike =>
  typeof value === 'object' &&
  value !== null &&
  'toMillis' in value &&
  typeof value.toMillis === 'function';

const myReportSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  capturedAt: z.custom<TimestampLike>(isTimestampLike),
  note: z.string().optional(),
  photo: z.object({ path: z.string().min(1) }).optional(),
});

/**
 * Valida un documento de `reports` leído de Firestore.
 *
 * @returns El reporte, o `null` si el documento no tiene la forma esperada.
 */
export function parseMyReport(id: string, data: unknown): MyReport | null {
  const parsed = myReportSchema.safeParse(data);
  if (!parsed.success) return null;
  const { status, capturedAt, note, photo } = parsed.data;
  return {
    id,
    status,
    capturedAtMs: capturedAt.toMillis(),
    note: note ?? null,
    photoPath: photo?.path ?? null,
  };
}

export type StatusPresentation = {
  /** Símbolo que acompaña al texto: el estado nunca se comunica solo con color (RNF06). */
  symbol: string;
  label: string;
  /** Qué significa el estado para el ciudadano. */
  description: string;
};

const PRESENTATIONS: Record<ReportStatus, StatusPresentation> = {
  pending_upload: {
    symbol: '⏳',
    label: 'Pendiente de subir',
    description: 'Guardado en el teléfono. La foto sube sola cuando hay conexión.',
  },
  processing_ai: {
    symbol: '◔',
    label: 'En análisis',
    description: 'La foto llegó y se está clasificando.',
  },
  needs_review: {
    symbol: '◑',
    label: 'En revisión',
    description: 'Una persona de la entidad de aseo va a revisarlo.',
  },
  approved: {
    symbol: '✓',
    label: 'Aprobado',
    description: 'Ya aparece en el mapa y espera atención.',
  },
  in_progress: {
    symbol: '▶',
    label: 'En atención',
    description: 'La entidad de aseo está atendiéndolo.',
  },
  resolved: { symbol: '✓✓', label: 'Resuelto', description: 'Los residuos fueron recogidos.' },
  rejected: {
    symbol: '✕',
    label: 'Rechazado',
    description: 'La foto no mostraba residuos en la vía pública.',
  },
  cancelled: { symbol: '⊘', label: 'Cancelado', description: 'Lo cancelaste antes de subirlo.' },
};

/** Símbolo, nombre y explicación de un estado, en palabras para el ciudadano. */
export function statusPresentation(status: ReportStatus): StatusPresentation {
  return PRESENTATIONS[status];
}
