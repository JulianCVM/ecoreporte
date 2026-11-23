import { PHOTO_MAX_BYTES, PHOTO_MAX_EDGE_PX } from '../limits';
import {
  PHOTO_COMPRESSION_STEPS,
  PhotoTooLargeError,
  compressToLimit,
  fitWithinMaxEdge,
  isPhotoWithinLimit,
  type CompressionStep,
  type EncodedPhoto,
} from '../photo-compression';

const encoded = (bytes: number, uri = `file:///cache/${bytes}.jpg`): EncodedPhoto => ({
  uri,
  bytes,
  widthPx: 1600,
  heightPx: 1200,
});

describe('fitWithinMaxEdge', () => {
  it('reduce una foto horizontal hasta el lado mayor permitido', () => {
    expect(fitWithinMaxEdge({ widthPx: 4000, heightPx: 3000 })).toEqual({
      widthPx: PHOTO_MAX_EDGE_PX,
      heightPx: 1200,
    });
  });

  it('reduce una foto vertical por su alto', () => {
    expect(fitWithinMaxEdge({ widthPx: 3000, heightPx: 4000 })).toEqual({
      widthPx: 1200,
      heightPx: PHOTO_MAX_EDGE_PX,
    });
  });

  it('no agranda una foto que ya cabe', () => {
    expect(fitWithinMaxEdge({ widthPx: 1024, heightPx: 768 })).toEqual({
      widthPx: 1024,
      heightPx: 768,
    });
  });

  it('una panorámica muy angosta conserva al menos 1 px de alto', () => {
    expect(fitWithinMaxEdge({ widthPx: 20000, heightPx: 2 })).toEqual({
      widthPx: PHOTO_MAX_EDGE_PX,
      heightPx: 1,
    });
  });

  it.each([
    [0, 100],
    [100, -1],
    [Number.NaN, 100],
  ])('rechaza dimensiones inválidas (%p × %p)', (widthPx, heightPx) => {
    expect(() => fitWithinMaxEdge({ widthPx, heightPx })).toThrow(RangeError);
  });
});

describe('isPhotoWithinLimit', () => {
  it.each([
    [1, true],
    [PHOTO_MAX_BYTES, true],
    [PHOTO_MAX_BYTES + 1, false],
    [0, false],
    [Number.NaN, false],
  ])('%p bytes → %p', (bytes, expected) => {
    expect(isPhotoWithinLimit(bytes)).toBe(expected);
  });
});

describe('compressToLimit', () => {
  it('se queda con el primer intento si ya cabe', async () => {
    const encode = jest.fn(async () => encoded(400_000));

    await expect(compressToLimit(encode)).resolves.toEqual(encoded(400_000));
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(PHOTO_COMPRESSION_STEPS[0]);
  });

  it('baja la calidad antes que la resolución y descarta los intentos que no caben', async () => {
    const sizes = [PHOTO_MAX_BYTES + 500, PHOTO_MAX_BYTES + 1, 900_000];
    const used: CompressionStep[] = [];
    const discarded: number[] = [];

    const photo = await compressToLimit(
      async (step) => {
        used.push(step);
        return encoded(sizes[used.length - 1]);
      },
      (rejected) => discarded.push(rejected.bytes),
    );

    expect(photo.bytes).toBe(900_000);
    expect(discarded).toEqual([PHOTO_MAX_BYTES + 500, PHOTO_MAX_BYTES + 1]);
    expect(used[1].maxEdgePx).toBe(used[0].maxEdgePx);
    expect(used[1].jpegQuality).toBeLessThan(used[0].jpegQuality);
    expect(used[2].maxEdgePx).toBeLessThan(used[1].maxEdgePx);
  });

  it('nunca devuelve una foto por encima del límite: falla con su peso', async () => {
    const discard = jest.fn();
    const tooBig = PHOTO_MAX_BYTES * 2;

    const failure = compressToLimit(async () => encoded(tooBig), discard);

    await expect(failure).rejects.toBeInstanceOf(PhotoTooLargeError);
    await expect(failure).rejects.toMatchObject({ bytes: tooBig });
    expect(discard).toHaveBeenCalledTimes(PHOTO_COMPRESSION_STEPS.length);
  });

  it('los intentos nunca piden más resolución ni más calidad que el anterior', () => {
    PHOTO_COMPRESSION_STEPS.slice(1).forEach((step, index) => {
      const previous = PHOTO_COMPRESSION_STEPS[index];
      expect(step.maxEdgePx).toBeLessThanOrEqual(previous.maxEdgePx);
      expect(step.jpegQuality).toBeLessThanOrEqual(previous.jpegQuality);
    });
  });
});
