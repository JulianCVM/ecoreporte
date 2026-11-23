import { z } from 'zod';

import { parseMyReport, type MyReport } from './my-report';
import {
  COMPLEXITIES,
  REPORT_STATUSES,
  WASTE_CATEGORIES,
  type Actor,
  type Complexity,
  type ReportStatus,
  type WasteCategory,
} from './types';

/** Un paso del historial de un reporte, en orden cronológico. */
export type TimelineStep = {
  status: ReportStatus;
  /** Epoch en ms; `null` si el cambio no dejó hora (la cancelación del autor). */
  atMs: number | null;
  by: Actor;
  /** Por qué fue a revisión sin veredicto de la IA; `null` en los demás pasos. */
  reason: string | null;
};

/** Lo que la IA dijo del reporte y que el ciudadano puede ver. */
export type AiSummary = { category: WasteCategory; complexity: Complexity; summary: string };

/** El reporte con lo que muestra la pantalla de detalle (RF06). */
export type ReportDetail = MyReport & {
  latitude: number | null;
  longitude: number | null;
  ai: AiSummary | null;
  timeline: TimelineStep[];
};

type TimestampLike = { toMillis: () => number };
const timestampSchema = z.custom<TimestampLike>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function',
);

const historyEntrySchema = z.object({
  status: z.enum(REPORT_STATUSES),
  by: z.enum(['author', 'operator', 'system']),
  at: timestampSchema,
  reason: z.string().optional(),
});

const aiSchema = z.object({
  category: z.enum(WASTE_CATEGORIES),
  complexity: z.enum(COMPLEXITIES),
  summary: z.string(),
});

const locationSchema = z.object({ latitude: z.number(), longitude: z.number() });

/**
 * Arma el historial que ve el ciudadano. `statusHistory` solo guarda los cambios de la
 * Function y del operador, así que se le agrega el inicio (la captura) y, si el estado actual
 * no quedó en el rastro (el autor canceló), el estado actual sin hora.
 */
export function reportTimeline(
  report: Pick<MyReport, 'status' | 'capturedAtMs'>,
  history: readonly TimelineStep[],
): TimelineStep[] {
  const steps: TimelineStep[] = [
    { status: 'pending_upload', atMs: report.capturedAtMs, by: 'author', reason: null },
    ...history,
  ];
  if (steps[steps.length - 1].status !== report.status) {
    steps.push({ status: report.status, atMs: null, by: 'author', reason: null });
  }
  return steps;
}

/**
 * Valida un documento de `reports` para la pantalla de detalle. Lo que falte o venga dañado
 * en `ai`, `location` o una entrada del historial se omite: el reporte se muestra igual.
 *
 * @returns El detalle, o `null` si el documento no sirve ni para la lista (`parseMyReport`).
 */
export function parseReportDetail(id: string, data: unknown): ReportDetail | null {
  const report = parseMyReport(id, data);
  if (!report) return null;
  const fields = data as Record<string, unknown>;

  const rawHistory = Array.isArray(fields.statusHistory) ? fields.statusHistory : [];
  const history = rawHistory.flatMap((entry): TimelineStep[] => {
    const parsed = historyEntrySchema.safeParse(entry);
    if (!parsed.success) return [];
    const { status, by, at, reason } = parsed.data;
    return [{ status, by, atMs: at.toMillis(), reason: reason ?? null }];
  });
  const ai = aiSchema.safeParse(fields.ai);
  const location = locationSchema.safeParse(fields.location);

  return {
    ...report,
    latitude: location.success ? location.data.latitude : null,
    longitude: location.success ? location.data.longitude : null,
    ai: ai.success ? ai.data : null,
    timeline: reportTimeline(report, history),
  };
}

const CATEGORY_LABELS: Record<WasteCategory, string> = {
  via_publica: 'Residuos en la vía pública',
  domiciliario_ilegal: 'Residuos domiciliarios fuera de sitio u horario',
  escombros: 'Escombros o voluminosos',
  sin_residuo: 'Sin residuos',
};

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  baja: 'Baja: lo recoge una persona',
  media: 'Media: varias personas o un vehículo pequeño',
  alta: 'Alta: necesita maquinaria o bloquea el paso',
};

export const categoryLabel = (category: WasteCategory): string => CATEGORY_LABELS[category];
export const complexityLabel = (complexity: Complexity): string => COMPLEXITY_LABELS[complexity];

// Motivos que escribe la Function (docs/03-modelo-de-datos.md, `statusHistory.reason`).
const REVIEW_REASONS: Record<string, string> = {
  ai_failed: 'El análisis automático no respondió.',
  ai_disabled: 'El análisis automático está en pausa.',
  ai_daily_limit: 'Se alcanzó el cupo diario del análisis automático.',
  user_daily_limit: 'Superaste el número de reportes diarios que se analizan solos.',
};

/** El motivo de una revisión, en palabras para el ciudadano. */
export function reviewReasonText(reason: string): string {
  return REVIEW_REASONS[reason] ?? 'No se pudo analizar automáticamente.';
}
