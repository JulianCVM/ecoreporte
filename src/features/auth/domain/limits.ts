/**
 * Límites de la cuenta (docs/05-parametrizacion.md · Constantes del dominio).
 * Si cambias uno que también validan las reglas de Firestore, cámbialo allá.
 */

/** Firebase Auth acepta desde 6; se piden 8, el mínimo que recomienda NIST SP 800-63B. */
export const PASSWORD_MIN_LENGTH = 8;

/** Nombre visible en el perfil y en el rastro de los operadores. */
export const DISPLAY_NAME_MIN_CHARS = 2;
export const DISPLAY_NAME_MAX_CHARS = 40;
