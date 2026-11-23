import { newUploadEntry } from '../../domain/upload-queue';
import { uploadQueuedPhoto } from '../photo-uploader';

/** Estado del Storage y del disco simulados. */
const mockState = {
  localExists: true,
  putFileError: null as unknown,
  remoteExists: false,
  putFileCalls: [] as { path: string; uri: string; contentType?: string }[],
};

jest.mock('@/lib/firebase', () => ({
  storage: () => ({}),
  ref: (_storage: unknown, path: string) => ({ path }),
  setMaxUploadRetryTime: async () => undefined,
  putFile: async (target: { path: string }, uri: string, metadata?: { contentType?: string }) => {
    mockState.putFileCalls.push({ path: target.path, uri, contentType: metadata?.contentType });
    if (mockState.putFileError) throw mockState.putFileError;
  },
  getMetadata: async () => {
    if (!mockState.remoteExists)
      throw Object.assign(new Error('no existe'), { code: 'storage/object-not-found' });
    return {};
  },
}));

jest.mock('../upload-queue-store', () => ({
  queuedPhotoExists: () => mockState.localExists,
}));

const storageError = (code: string) => Object.assign(new Error(code), { code });

const entry = newUploadEntry(
  {
    reportId: 'AbCdEfGhIjKlMnOpQrSt',
    authorUid: 'uid-1',
    storagePath: 'reports/uid-1/AbCdEfGhIjKlMnOpQrSt.jpg',
    localUri: 'file:///docs/upload-queue/AbCdEfGhIjKlMnOpQrSt.jpg',
  },
  0,
);

beforeEach(() => {
  mockState.localExists = true;
  mockState.putFileError = null;
  mockState.remoteExists = false;
  mockState.putFileCalls = [];
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('uploadQueuedPhoto', () => {
  it('sube la copia local a la ruta del reporte como JPEG', async () => {
    await expect(uploadQueuedPhoto(entry)).resolves.toEqual({ kind: 'uploaded' });
    expect(mockState.putFileCalls).toEqual([
      { path: entry.storagePath, uri: entry.localUri, contentType: 'image/jpeg' },
    ]);
  });

  it('sin la foto local no hay nada que reintentar', async () => {
    mockState.localExists = false;

    const outcome = await uploadQueuedPhoto(entry);

    expect(outcome.kind).toBe('fatal');
    expect(mockState.putFileCalls).toEqual([]);
  });

  it('una falla de red se reintenta y conserva el código del error', async () => {
    mockState.putFileError = storageError('storage/retry-limit-exceeded');

    await expect(uploadQueuedPhoto(entry)).resolves.toEqual({
      kind: 'retry',
      message: expect.stringContaining('storage/retry-limit-exceeded'),
    });
  });

  // AM-21: storage.rules solo deja crear el archivo una vez.
  it('si las reglas niegan porque la foto ya subió, cuenta como subida', async () => {
    mockState.putFileError = storageError('storage/unauthorized');
    mockState.remoteExists = true;

    await expect(uploadQueuedPhoto(entry)).resolves.toEqual({ kind: 'uploaded' });
  });

  it('si las reglas niegan y la foto no está en Storage, sigue siendo una falla', async () => {
    mockState.putFileError = storageError('storage/unauthorized');

    expect((await uploadQueuedPhoto(entry)).kind).toBe('retry');
  });
});
