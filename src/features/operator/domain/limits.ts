/** Límites de la bandeja del operador (docs/05-parametrizacion.md · Constantes del dominio). */

// Lo que un operador revisa de una sentada; más reportes piden paginación, que no es del MVP.
export const OPERATOR_INBOX_LIMIT = 50;

// Las alertas activas son pocas por diseño (solo complejidad alta); este tope acota la lectura.
export const OPERATOR_ALERTS_LIMIT = 20;
