/** Lo que la app necesita saber del permiso de cámara del sistema. */
export type CameraPermission = { granted: boolean; canAskAgain: boolean };

/**
 * - `checking`: todavía no se sabe (el sistema no ha respondido).
 * - `granted`: se puede abrir la cámara.
 * - `ask`: se puede mostrar el diálogo del sistema.
 * - `blocked`: el usuario lo negó de forma definitiva; solo se activa desde los ajustes.
 */
export type CameraAccess = 'checking' | 'granted' | 'ask' | 'blocked';

/** Decide qué mostrar en lugar de la cámara según el permiso (issue #8). */
export function cameraAccess(permission: CameraPermission | null | undefined): CameraAccess {
  if (!permission) return 'checking';
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'ask' : 'blocked';
}
