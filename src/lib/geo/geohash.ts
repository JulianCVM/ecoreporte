import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common';

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

/**
 * Rangos de geohash que cubren un círculo, para consultar por cercanía con `orderBy('geohash')`
 * (docs/03-modelo-de-datos.md). Los rangos cubren de más: quien consulta descarta por distancia.
 *
 * @returns Pares `[inicio, fin]` para `startAt` y `endAt`.
 */
export function geohashRanges(center: Coordinates, radiusM: number): [string, string][] {
  return geohashQueryBounds([center.latitude, center.longitude], radiusM);
}

/** Distancia en metros entre dos puntos, sobre la superficie de la Tierra. */
export function distanceM(from: Coordinates, to: Coordinates): number {
  const METERS_PER_KM = 1000;
  return (
    distanceBetween([from.latitude, from.longitude], [to.latitude, to.longitude]) * METERS_PER_KM
  );
}
