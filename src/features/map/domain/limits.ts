/** Límites del mapa (docs/05-parametrizacion.md · Constantes del dominio). */

// Lo que se alcanza a pie o en un recorrido corto de la cuadrilla; más radio trae más lecturas.
export const MAP_RADIUS_M = 3_000;

// Tope por rango de geohash: acota las lecturas de Firestore en una zona con muchos reportes.
export const MAP_REPORTS_PER_RANGE_LIMIT = 50;

// Con este zoom el radio de búsqueda cabe en la pantalla de un teléfono.
export const MAP_INITIAL_ZOOM = 13;

// Sin permiso de ubicación el mapa abre en el centro de Bucaramanga, la ciudad del proyecto.
export const MAP_FALLBACK_CENTER = { latitude: 7.11935, longitude: -73.12274 };

// La búsqueda se recalcula cuando el usuario se mueve unos 110 m (tres decimales de grado),
// no con cada lectura del GPS.
export const MAP_CENTER_DECIMALS = 3;
