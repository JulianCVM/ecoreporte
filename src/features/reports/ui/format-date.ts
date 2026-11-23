/** Fecha y hora como las lee un ciudadano en Colombia: «23 nov 2026, 10:04 a. m.». */
export const formatDate = (ms: number): string =>
  new Date(ms).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
