import {
  UPLOAD_BACKOFF_MAX_MS,
  UPLOAD_MAX_ATTEMPTS,
  accuracyLevel,
  uploadBackoffMs,
} from '../limits';

describe('accuracyLevel', () => {
  it.each([
    [5, 'good'],
    [10, 'good'],
    [10.1, 'acceptable'],
    [50, 'acceptable'],
    [51, 'too_low'],
    [null, 'too_low'],
    [undefined, 'too_low'],
    [-1, 'too_low'],
    [Number.NaN, 'too_low'],
  ] as const)('%p m → %s', (input, expected) => {
    expect(accuracyLevel(input)).toBe(expected);
  });
});

describe('uploadBackoffMs', () => {
  it('crece de forma exponencial desde 2 s', () => {
    expect(uploadBackoffMs(1)).toBe(2_000);
    expect(uploadBackoffMs(2)).toBe(4_000);
    expect(uploadBackoffMs(3)).toBe(8_000);
  });

  it('nunca pasa del tope', () => {
    for (let attempt = 1; attempt < UPLOAD_MAX_ATTEMPTS; attempt++) {
      expect(uploadBackoffMs(attempt)).toBeLessThanOrEqual(UPLOAD_BACKOFF_MAX_MS);
    }
  });

  it('deja de reintentar al llegar al máximo', () => {
    expect(uploadBackoffMs(UPLOAD_MAX_ATTEMPTS)).toBeNull();
  });

  it('el intento 0 o inválido no espera', () => {
    expect(uploadBackoffMs(0)).toBe(0);
    expect(uploadBackoffMs(1.5)).toBe(0);
  });
});
