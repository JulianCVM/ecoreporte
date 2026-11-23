import { newUploadEntry } from '../../domain/upload-queue';
import {
  deleteQueuedPhoto,
  loadUploadQueue,
  queuedPhotoExists,
  saveUploadQueue,
  storeQueuedPhoto,
} from '../upload-queue-store';

/** Disco simulado: URI → contenido. */
const mockDisk = new Map<string, string>();

// Crashlytics es nativo: aquí solo importa que el error se registre en la consola.
jest.mock('@/lib/firebase', () => ({ crashlytics: () => ({}), recordError: jest.fn() }));

jest.mock('expo-file-system', () => {
  const join = (parts: (string | { uri: string })[]) =>
    parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    create() {}
  }
  class MockFile {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockDisk.has(this.uri);
    }
    create() {
      mockDisk.set(this.uri, '');
    }
    textSync() {
      return mockDisk.get(this.uri) ?? '';
    }
    writeSync(content: string) {
      mockDisk.set(this.uri, content);
    }
    copySync(destination: { uri: string }) {
      mockDisk.set(destination.uri, mockDisk.get(this.uri) ?? '');
    }
    delete() {
      mockDisk.delete(this.uri);
    }
  }
  return { Directory: MockDirectory, File: MockFile, Paths: { document: { uri: 'file:///docs' } } };
});

const QUEUE_URI = 'file:///docs/upload-queue/queue.json';

const entry = (reportId: string) =>
  newUploadEntry(
    {
      reportId,
      authorUid: 'uid-1',
      storagePath: `reports/uid-1/${reportId}.jpg`,
      localUri: `file:///docs/upload-queue/${reportId}.jpg`,
    },
    1_795_000_000_000,
  );

beforeEach(() => {
  mockDisk.clear();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('cola en disco', () => {
  it('sin archivo, la cola está vacía', () => {
    expect(loadUploadQueue()).toEqual([]);
  });

  it('lo guardado se lee igual: así la cola sobrevive al cierre de la app', () => {
    saveUploadQueue([entry('a'), entry('b')]);
    expect(loadUploadQueue()).toEqual([entry('a'), entry('b')]);
  });

  it('una entrada dañada se descarta sin perder las demás', () => {
    mockDisk.set(QUEUE_URI, JSON.stringify([entry('a'), { reportId: 'roto' }, entry('b')]));

    expect(loadUploadQueue().map(({ reportId }) => reportId)).toEqual(['a', 'b']);
    expect(console.error).toHaveBeenCalled();
  });

  it('un archivo ilegible no tumba la app: la cola empieza vacía y queda registrado', () => {
    mockDisk.set(QUEUE_URI, '{no es json');

    expect(loadUploadQueue()).toEqual([]);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('fotos de la cola', () => {
  it('copia la foto con el ID del reporte y la borra cuando ya no hace falta', () => {
    mockDisk.set('file:///cache/foto.jpg', 'jpeg');

    const localUri = storeQueuedPhoto('file:///cache/foto.jpg', 'AbCdEfGhIjKlMnOpQrSt');

    expect(localUri).toBe('file:///docs/upload-queue/AbCdEfGhIjKlMnOpQrSt.jpg');
    expect(queuedPhotoExists(localUri)).toBe(true);

    deleteQueuedPhoto(localUri);
    expect(queuedPhotoExists(localUri)).toBe(false);
  });
});
