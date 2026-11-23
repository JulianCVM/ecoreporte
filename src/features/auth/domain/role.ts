/** Rol del usuario. Viene del custom claim `role` del token, nunca de un documento editable. */
export const ROLES = ['citizen', 'operator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/**
 * Lee el rol de los claims del token. Sin claim, o con un valor que la app no conoce, el
 * usuario es un ciudadano: ante la duda se da el permiso menor.
 */
export function roleFromClaims(claims: unknown): Role {
  if (typeof claims !== 'object' || claims === null || !('role' in claims)) return 'citizen';
  const { role } = claims;
  return role === 'operator' || role === 'admin' ? role : 'citizen';
}

/** `true` para quien atiende reportes. Las reglas tratan igual al operador y al administrador. */
export function isStaff(role: Role): boolean {
  return role === 'operator' || role === 'admin';
}

const ROLE_LABELS: Record<Role, string> = {
  citizen: 'Ciudadano',
  operator: 'Operador de la entidad de aseo',
  admin: 'Administrador',
};

export const roleLabel = (role: Role): string => ROLE_LABELS[role];
