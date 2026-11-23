import type { ReportStatus } from './types';

/** De dónde sale la foto que se le muestra al autor. */
export type PhotoOrigin = 'local' | 'remote' | 'none';

/**
 * Decide de dónde mostrar la foto de un reporte.
 *
 * Mientras la foto está en la cola de subida se usa la copia del teléfono: funciona sin
 * conexión. La cola borra esa copia al subirla, así que después se lee de Storage. Un reporte
 * pendiente sin copia local (se creó en otro teléfono) o cancelado no tiene foto que mostrar.
 */
export function photoOrigin(status: ReportStatus, hasLocalCopy: boolean): PhotoOrigin {
  if (hasLocalCopy) return 'local';
  if (status === 'pending_upload' || status === 'cancelled') return 'none';
  return 'remote';
}
