import { PHOTO_JPEG_QUALITY, PHOTO_MAX_BYTES, PHOTO_MAX_EDGE_PX } from '../../domain/limits';
import { PhotoTooLargeError } from '../../domain/photo-compression';
import { compressPhoto } from '../photo-compressor';

/** Tamaño que tendrá cada archivo guardado, en orden, y registro de lo que hizo el módulo nativo. */
const mockNative = {
  sizesBytes: [] as number[],
  source: { width: 4000, height: 3000 },
  resizes: [] as { width: number; height: number }[],
  saves: [] as { compress: number; format: string }[],
  files: new Map<string, number>(),
  released: 0,
};

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => {
      let size = { ...mockNative.source };
      const context = {
        resize(target: { width: number; height: number }) {
          mockNative.resizes.push(target);
          size = target;
          return context;
        },
        renderAsync: async () => ({
          ...size,
          release: () => {
            mockNative.released += 1;
          },
          saveAsync: async (options: { compress: number; format: string }) => {
            mockNative.saves.push(options);
            const uri = `file:///cache/intento-${mockNative.saves.length}.jpg`;
            mockNative.files.set(uri, mockNative.sizesBytes[mockNative.saves.length - 1]);
            return { uri, ...size };
          },
        }),
      };
      return context;
    },
  },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    uri: string;
    constructor(mockUri: string) {
      this.uri = mockUri;
    }
    get exists() {
      return mockNative.files.has(this.uri);
    }
    info() {
      return { exists: this.exists, size: mockNative.files.get(this.uri) };
    }
    delete() {
      mockNative.files.delete(this.uri);
    }
  },
}));

beforeEach(() => {
  mockNative.sizesBytes = [];
  mockNative.source = { width: 4000, height: 3000 };
  mockNative.resizes = [];
  mockNative.saves = [];
  mockNative.files.clear();
  mockNative.released = 0;
});

describe('compressPhoto', () => {
  it('reduce al lado mayor permitido y guarda en JPEG con la calidad del dominio', async () => {
    mockNative.sizesBytes = [450_000];

    const photo = await compressPhoto('file:///cache/camara.jpg');

    expect(photo).toEqual({
      uri: 'file:///cache/intento-1.jpg',
      widthPx: PHOTO_MAX_EDGE_PX,
      heightPx: 1200,
      bytes: 450_000,
    });
    expect(mockNative.saves).toEqual([{ compress: PHOTO_JPEG_QUALITY, format: 'jpeg' }]);
  });

  it('usa las dimensiones de la imagen decodificada: una foto vertical se limita por el alto', async () => {
    mockNative.source = { width: 3000, height: 4000 };
    mockNative.sizesBytes = [450_000];

    await compressPhoto('file:///cache/camara.jpg');

    expect(mockNative.resizes).toEqual([{ width: 1200, height: PHOTO_MAX_EDGE_PX }]);
  });

  it('si el primer intento no cabe, lo borra del caché y entrega el que sí cabe', async () => {
    mockNative.sizesBytes = [PHOTO_MAX_BYTES + 1, 800_000];

    const photo = await compressPhoto('file:///cache/camara.jpg');

    expect(photo.bytes).toBe(800_000);
    expect([...mockNative.files.keys()]).toEqual([photo.uri]);
  });

  it('si ningún intento cabe, falla y no deja archivos ni imágenes nativas sin liberar', async () => {
    mockNative.sizesBytes = Array.from({ length: 10 }, () => PHOTO_MAX_BYTES * 3);

    await expect(compressPhoto('file:///cache/camara.jpg')).rejects.toBeInstanceOf(
      PhotoTooLargeError,
    );
    expect(mockNative.files.size).toBe(0);
    // Dos imágenes nativas por intento: la original decodificada y la redimensionada.
    expect(mockNative.released).toBe(mockNative.saves.length * 2);
  });
});
