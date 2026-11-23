import { distanceM, encodeGeohash, GEOHASH_PRECISION, geohashRanges } from '../geohash';

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

describe('geohashRanges y distanceM', () => {
  const center = { latitude: 7.11935, longitude: -73.12274 };
  const inRanges = (point: { latitude: number; longitude: number }, radiusM: number) => {
    const hash = encodeGeohash(point);
    return geohashRanges(center, radiusM).some(([start, end]) => hash >= start && hash <= end);
  };

  it('los rangos cubren un punto dentro del radio', () => {
    const near = { latitude: 7.1255, longitude: -73.1185 };
    expect(distanceM(center, near)).toBeLessThan(1000);
    expect(inRanges(near, 1000)).toBe(true);
  });

  it('un punto en otra ciudad queda fuera de los rangos', () => {
    const bogota = { latitude: 4.711, longitude: -74.0721 };
    expect(inRanges(bogota, 1000)).toBe(false);
  });

  it('mide en metros', () => {
    // Un milésimo de grado de latitud son unos 111 m.
    const north = { latitude: center.latitude + 0.001, longitude: center.longitude };
    expect(distanceM(center, north)).toBeGreaterThan(105);
    expect(distanceM(center, north)).toBeLessThan(115);
  });
});
