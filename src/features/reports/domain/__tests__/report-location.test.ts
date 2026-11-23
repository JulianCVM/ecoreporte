import { LOCATION_GOOD_ACCURACY_M, LOCATION_MAX_ACCURACY_M } from '../limits';
import { accuracyStatus, canSubmitLocation, formatAccuracy } from '../report-location';

const reading = (accuracyM: number | null) => ({
  latitude: 7.11935,
  longitude: -73.12274,
  accuracyM,
});

describe('canSubmitLocation', () => {
  it('acepta hasta el límite de precisión, inclusive', () => {
    expect(canSubmitLocation(reading(LOCATION_GOOD_ACCURACY_M))).toBe(true);
    expect(canSubmitLocation(reading(LOCATION_MAX_ACCURACY_M))).toBe(true);
  });

  it('con precisión peor que el límite no se puede enviar', () => {
    expect(canSubmitLocation(reading(LOCATION_MAX_ACCURACY_M + 0.1))).toBe(false);
  });

  it('sin lectura o sin radio de error tampoco: no se sabe dónde está el reporte', () => {
    expect(canSubmitLocation(null)).toBe(false);
    expect(canSubmitLocation(undefined)).toBe(false);
    expect(canSubmitLocation(reading(null))).toBe(false);
  });
});

describe('accuracyStatus', () => {
  it('cada nivel tiene un símbolo y un texto distintos: no depende del color', () => {
    const statuses = [accuracyStatus(5), accuracyStatus(30), accuracyStatus(80)];

    expect(statuses.map((status) => status.level)).toEqual(['good', 'acceptable', 'too_low']);
    expect(new Set(statuses.map((status) => status.symbol)).size).toBe(3);
    expect(new Set(statuses.map((status) => status.label)).size).toBe(3);
  });

  it('solo la precisión insuficiente explica qué hacer', () => {
    expect(accuracyStatus(5).hint).toBeNull();
    expect(accuracyStatus(30).hint).toBeNull();
    expect(accuracyStatus(80).hint).toMatch(/no se puede enviar/);
  });
});

describe('formatAccuracy', () => {
  it.each([
    [8, '±8 m'],
    [8.2, '±9 m'],
    [0, '±0 m'],
    [null, 'sin dato'],
    [undefined, 'sin dato'],
    [Number.NaN, 'sin dato'],
    [-1, 'sin dato'],
  ])('%p → %s', (accuracyM, expected) => {
    expect(formatAccuracy(accuracyM)).toBe(expected);
  });
});
