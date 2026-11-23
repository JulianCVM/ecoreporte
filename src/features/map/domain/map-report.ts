import { z } from 'zod';

import { isPublic } from '@/features/reports/domain/report-status';
import {
  COMPLEXITIES,
  REPORT_STATUSES,
  WASTE_CATEGORIES,
  type Complexity,
  type ReportStatus,
  type WasteCategory,
} from '@/features/reports/domain/types';

/** Un reporte público en el mapa (RF05). No lleva autor ni foto: no se muestran a terceros. */
export type MapReport = {
  id: string;
  status: ReportStatus;
  latitude: number;
  longitude: number;
  category: WasteCategory;
  complexity: Complexity;
  summary: string;
};

const mapReportSchema = z.object({
  status: z.enum(REPORT_STATUSES),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  ai: z.object({
    category: z.enum(WASTE_CATEGORIES),
    complexity: z.enum(COMPLEXITIES),
    summary: z.string(),
  }),
});

/**
 * Valida un documento de `reports` para el mapa.
 *
 * @returns El reporte, o `null` si no es público (`isPublic`) o no tiene la forma esperada.
 * Las reglas ya impiden leer uno que no sea público; esto evita pintarlo si algo cambia.
 */
export function parseMapReport(id: string, data: unknown): MapReport | null {
  const parsed = mapReportSchema.safeParse(data);
  if (!parsed.success || !isPublic(parsed.data.status)) return null;
  const { status, location, ai } = parsed.data;
  return { id, status, latitude: location.latitude, longitude: location.longitude, ...ai };
}

/** Estados que tiene un reporte público, en el orden en que se atiende. */
export const MAP_STATUSES = REPORT_STATUSES.filter(isPublic);

/** Tipos que puede tener un reporte público: uno `sin_residuo` siempre se rechaza. */
export const MAP_CATEGORIES = WASTE_CATEGORIES.filter((category) => category !== 'sin_residuo');

/** Filtros del mapa. Una lista vacía no filtra: muestra todos los valores. */
export type MapFilters = {
  statuses: readonly ReportStatus[];
  categories: readonly WasteCategory[];
  complexities: readonly Complexity[];
};

export const NO_FILTERS: MapFilters = { statuses: [], categories: [], complexities: [] };

const passes = <T>(selected: readonly T[], value: T) =>
  selected.length === 0 || selected.includes(value);

/** Reportes que cumplen todos los filtros activos. */
export function applyFilters<T extends MapReport>(reports: readonly T[], filters: MapFilters): T[] {
  return reports.filter(
    (report) =>
      passes(filters.statuses, report.status) &&
      passes(filters.categories, report.category) &&
      passes(filters.complexities, report.complexity),
  );
}

/** Agrega el valor si no estaba en la lista y lo quita si estaba. */
export function toggled<T>(selected: readonly T[], value: T): T[] {
  return selected.includes(value)
    ? selected.filter((current) => current !== value)
    : [...selected, value];
}

export const METERS_PER_KM = 1000;

/** «350 m» o «1,2 km», como se lee una distancia en Colombia. */
export function formatDistance(distanceM: number): string {
  if (distanceM < METERS_PER_KM) return `${Math.round(distanceM)} m`;
  return `${(distanceM / METERS_PER_KM).toFixed(1).replace('.', ',')} km`;
}
