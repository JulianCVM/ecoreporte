import { geohashForLocation } from 'geofire-common';

/**
 * Largo del geohash de un reporte (docs/03-modelo-de-datos.md). Nueve caracteres dan celdas de
 * unos 5 m de lado; `firestore.rules` exige exactamente este largo.
 */
export const GEOHASH_PRECISION = 9;

export type Coordinates = { latitude: number; longitude: number };

/**
 * Geohash de unas coordenadas, compatible con las consultas por cercanía de `geofire-common`.
 *
 * @throws RangeError si la latitud o la longitud no son números dentro de su rango.
 */
export function encodeGeohash({ latitude, longitude }: Coordinates): string {
  const validLatitude = Number.isFinite(latitude) && Math.abs(latitude) <= 90;
  const validLongitude = Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  if (!validLatitude || !validLongitude) {
    throw new RangeError(`Coordenadas inválidas: latitud ${latitude}, longitud ${longitude}`);
  }
  return geohashForLocation([latitude, longitude], GEOHASH_PRECISION);
}
