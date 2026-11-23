/** Lo que la app necesita saber de un permiso del sistema (cámara, ubicación). */
export type SystemPermission = { granted: boolean; canAskAgain: boolean };

/**
 * - `checking`: todavía no se sabe (el sistema no ha respondido).
 * - `granted`: se puede usar el recurso.
 * - `ask`: se puede mostrar el diálogo del sistema.
 * - `blocked`: el usuario lo negó de forma definitiva; solo se activa desde los ajustes.
 */
export type PermissionAccess = 'checking' | 'granted' | 'ask' | 'blocked';

/** Decide qué mostrar en lugar de la cámara o la ubicación según el permiso (issues #8 y #9). */
export function permissionAccess(
  permission: SystemPermission | null | undefined,
): PermissionAccess {
  if (!permission) return 'checking';
  if (permission.granted) return 'granted';
  return permission.canAskAgain ? 'ask' : 'blocked';
}
