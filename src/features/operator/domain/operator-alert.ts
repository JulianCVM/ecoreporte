import { z } from 'zod';

import {
  COMPLEXITIES,
  WASTE_CATEGORIES,
  type Complexity,
  type WasteCategory,
} from '@/features/reports/domain/types';

/** Estados de una alerta (docs/03-modelo-de-datos.md). Solo avanza: abierta → atendida → cerrada. */
export const ALERT_STATUSES = ['open', 'acknowledged', 'closed'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/** Estados en los que la alerta sigue en la bandeja del operador. */
export const ACTIVE_ALERT_STATUSES = [
  'open',
  'acknowledged',
] as const satisfies readonly AlertStatus[];

/** Una alerta por complejidad alta, como la ve el operador (RF03). */
export type OperatorAlert = {
  id: string;
  reportId: string;
  status: AlertStatus;
  category: WasteCategory;
  complexity: Complexity;
  latitude: number;
  longitude: number;
  /** `null` mientras el servidor no confirma la hora. */
  createdAtMs: number | null;
};

type TimestampLike = { toMillis: () => number };
const timestampSchema = z.custom<TimestampLike>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof value.toMillis === 'function',
);

const alertSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(ALERT_STATUSES),
  category: z.enum(WASTE_CATEGORIES),
  complexity: z.enum(COMPLEXITIES),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  createdAt: timestampSchema.nullish(),
});

/**
 * Valida un documento de `alerts`.
 *
 * @returns La alerta, o `null` si el documento no tiene la forma esperada.
 */
export function parseAlert(id: string, data: unknown): OperatorAlert | null {
  const parsed = alertSchema.safeParse(data);
  if (!parsed.success) return null;
  const { location, createdAt, ...alert } = parsed.data;
  return {
    id,
    ...alert,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAtMs: createdAt?.toMillis() ?? null,
  };
}

export type AlertStep = {
  to: AlertStatus;
  /** Texto del botón. */
  label: string;
};

// Las mismas transiciones que permite `firestore.rules` en `alerts`.
const NEXT_STEP: Partial<Record<AlertStatus, AlertStep>> = {
  open: { to: 'acknowledged', label: 'Marcar como atendida' },
  acknowledged: { to: 'closed', label: 'Cerrar la alerta' },
};

/** El siguiente paso de una alerta, o `null` si ya está cerrada. */
export function nextAlertStep(status: AlertStatus): AlertStep | null {
  return NEXT_STEP[status] ?? null;
}

const STATUS_TEXTS: Record<AlertStatus, { symbol: string; label: string }> = {
  open: { symbol: '⚠', label: 'Alerta sin atender' },
  acknowledged: { symbol: '◑', label: 'Alerta atendida' },
  closed: { symbol: '✓', label: 'Alerta cerrada' },
};

/** Símbolo y nombre del estado de una alerta: nunca se comunica solo con color (RNF06). */
export const alertStatusText = (status: AlertStatus) => STATUS_TEXTS[status];
