import { GEOHASH_PRECISION, encodeGeohash } from '../geohash';

describe('encodeGeohash', () => {
  // Valores de referencia del algoritmo estándar (el ejemplo clásico es u4pruydqqvj).
  it.each([
    [{ latitude: 57.64911, longitude: 10.40744 }, 'u4pruydqq'],
    [{ latitude: -90, longitude: -180 }, '000000000'],
  ])('%p → %s', (coordinates, expected) => {
    expect(encodeGeohash(coordinates)).toBe(expected);
  });

  it('siempre tiene el largo que exige firestore.rules', () => {
    // Bucaramanga, donde se prueba la app.
    const geohash = encodeGeohash({ latitude: 7.11935, longitude: -73.12274 });
    expect(geohash).toHaveLength(GEOHASH_PRECISION);
    expect(geohash).toMatch(/^[0-9b-hjkmnp-z]+$/);
  });

  it('dos puntos a pocos metros comparten el prefijo, y uno lejano no', () => {
    const here = encodeGeohash({ latitude: 7.11935, longitude: -73.12274 });
    const nextDoor = encodeGeohash({ latitude: 7.11936, longitude: -73.12275 });
    const bogota = encodeGeohash({ latitude: 4.711, longitude: -74.0721 });

    expect(nextDoor.slice(0, 7)).toBe(here.slice(0, 7));
    expect(bogota.slice(0, 3)).not.toBe(here.slice(0, 3));
  });

  it.each([
    [{ latitude: 91, longitude: 0 }],
    [{ latitude: 0, longitude: -181 }],
    [{ latitude: Number.NaN, longitude: 0 }],
  ])('rechaza coordenadas fuera de rango: %p', (coordinates) => {
    expect(() => encodeGeohash(coordinates)).toThrow(RangeError);
  });
});
