/**
 * Topes de uso (RNF05, ADR 0007): cuentas puras de los contadores diarios. Las transacciones
 * que los leen y escriben están en `FirestoreReportStore`.
 */

// El día de los topes es el de Colombia: un ciudadano entiende «hoy» en su hora local.
export const USAGE_TIME_ZONE = 'America/Bogota';

/** Contador de un día, como se guarda en Firestore (`users/{uid}.reportsToday`, `aiUsage`). */
export type DailyCounter = { date: string; count: number };

/** Fecha `AAAA-MM-DD` del instante dado en la zona horaria de los topes. */
export function usageDay(atMs: number): string {
  // `en-CA` da el formato AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: USAGE_TIME_ZONE }).format(new Date(atMs));
}

/** Cuánto lleva el contador en `day`; un contador de otro día, ausente o dañado vale 0. */
export function countOn(counter: unknown, day: string): number {
  if (typeof counter !== 'object' || counter === null) return 0;
  const { date, count } = counter as Partial<DailyCounter>;
  if (date !== day || typeof count !== 'number' || !Number.isInteger(count) || count < 0) return 0;
  return count;
}

/**
 * Suma un reporte al contador del usuario. Se cuenta siempre, también el que pasa del tope:
 * así el contador dice cuántos reportes hizo en el día.
 *
 * @returns El contador nuevo y si este reporte quedó dentro de `REPORTS_PER_USER_PER_DAY`.
 */
export function addUserReport(
  counter: unknown,
  day: string,
  limit: number,
): { next: DailyCounter; withinLimit: boolean } {
  const count = countOn(counter, day) + 1;
  return { next: { date: day, count }, withinLimit: count <= limit };
}

/**
 * Reserva una llamada a la IA en el contador global. Solo suma si hay cupo: una llamada que
 * no se hace no gasta `AI_DAILY_LIMIT`.
 *
 * @returns El contador nuevo, o `null` si el tope del día ya se alcanzó.
 */
export function reserveAiCall(counter: unknown, day: string, limit: number): DailyCounter | null {
  const count = countOn(counter, day);
  return count < limit ? { date: day, count: count + 1 } : null;
}
