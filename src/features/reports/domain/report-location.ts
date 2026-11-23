import { accuracyLevel, type AccuracyLevel } from './limits';

/** Lectura del GPS tal como la necesita el reporte (docs/03-modelo-de-datos.md). */
export type LocationReading = {
  latitude: number;
  longitude: number;
  /** Radio de error en metros; `null` si el teléfono no lo informa. */
  accuracyM: number | null;
};

/** Cómo se le muestra la precisión al usuario: un símbolo y un texto, nunca solo un color. */
export type AccuracyStatus = {
  level: AccuracyLevel;
  symbol: string;
  label: string;
  /** Qué puede hacer el usuario cuando la precisión no alcanza. */
  hint: string | null;
};

const STATUS_BY_LEVEL: Record<AccuracyLevel, Omit<AccuracyStatus, 'level'>> = {
  good: { symbol: '✓', label: 'Precisión buena', hint: null },
  acceptable: { symbol: '●', label: 'Precisión aceptable', hint: null },
  too_low: {
    symbol: '⚠',
    label: 'Precisión insuficiente',
    hint: 'Con esta precisión no se puede enviar el reporte. Sal a un lugar abierto y espera unos segundos.',
  },
};

/** Con una precisión peor que `LOCATION_MAX_ACCURACY_M` (o desconocida) el reporte no se envía. */
export function canSubmitLocation(reading: LocationReading | null | undefined): boolean {
  return reading != null && accuracyLevel(reading.accuracyM) !== 'too_low';
}

/** Estado de la precisión para la pantalla, con su texto (RNF06: no depende del color). */
export function accuracyStatus(accuracyM: number | null | undefined): AccuracyStatus {
  const level = accuracyLevel(accuracyM);
  return { level, ...STATUS_BY_LEVEL[level] };
}

/** «±12 m», o «sin dato» si el teléfono no informó el radio de error. */
export function formatAccuracy(accuracyM: number | null | undefined): string {
  if (accuracyM == null || !Number.isFinite(accuracyM) || accuracyM < 0) return 'sin dato';
  return `±${Math.ceil(accuracyM)} m`;
}

const COORDINATE_DECIMALS = 5; // Cinco decimales son cerca de 1 m: suficiente para verificar a ojo.

/** «7.11935, -73.12274»: latitud y longitud como se le muestran al usuario. */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(COORDINATE_DECIMALS)}, ${longitude.toFixed(COORDINATE_DECIMALS)}`;
}
