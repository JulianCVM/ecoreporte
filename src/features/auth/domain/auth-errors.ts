/**
 * Mensajes en español para los errores de Firebase Auth (issue #6). El SDK los entrega con un
 * `code` como `auth/invalid-credential` y un mensaje en inglés que no se muestra.
 */

const CREDENTIALS = 'Correo o contraseña incorrectos.';

const MESSAGES: Readonly<Record<string, string>> = {
  'auth/invalid-email': 'El correo no es válido.',
  // Firebase ya no distingue «no existe» de «contraseña mala» (protección contra enumeración):
  // los tres códigos dan el mismo mensaje para no revelar qué correos tienen cuenta.
  'auth/invalid-credential': CREDENTIALS,
  'auth/user-not-found': CREDENTIALS,
  'auth/wrong-password': CREDENTIALS,
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
  'auth/weak-password': 'La contraseña es muy débil. Usa una más larga.',
  'auth/too-many-requests': 'Demasiados intentos. Espera un momento y vuelve a intentar.',
  'auth/network-request-failed': 'No hay conexión. Revisa tu red y vuelve a intentar.',
  'auth/operation-not-allowed': 'Este método de inicio de sesión no está habilitado.',
};

/** Mensaje para un error que no está en la tabla. */
export const UNKNOWN_AUTH_ERROR = 'No se pudo completar. Intenta de nuevo.';

/** El `code` de un error de Firebase, o `null` si no lo trae. */
export function authErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) return null;
  return typeof error.code === 'string' ? error.code : null;
}

/** Mensaje en español para mostrar al usuario. */
export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  return (code && MESSAGES[code]) || UNKNOWN_AUTH_ERROR;
}

/** `true` si el error está en la tabla; los demás se registran para investigarlos. */
export function isKnownAuthError(error: unknown): boolean {
  const code = authErrorCode(error);
  return code !== null && code in MESSAGES;
}
