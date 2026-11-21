import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

import { PHOTO_MAX_BYTES } from '../../src/features/reports/domain/limits';
import { actors, createRulesEnv, REPORT_ID, UIDS } from './rules-test-env';

let env: RulesTestEnvironment;
let as: ReturnType<typeof actors>;

beforeAll(async () => {
  env = await createRulesEnv();
  as = actors(env);
});
afterEach(() => env.clearStorage());
afterAll(() => env.cleanup());

const photoPath = `reports/${UIDS.author}/${REPORT_ID}.jpg`;
const JPEG = { contentType: 'image/jpeg' };
const bytes = (size: number) => new Uint8Array(size);

/** Sube la foto con el Admin SDK simulado, como si el autor ya la hubiera subido. */
const seedPhoto = (path = photoPath) =>
  env.withSecurityRulesDisabled(async (admin) => {
    await uploadBytes(ref(admin.storage(), path), bytes(1024), JPEG);
  });

describe('subir la foto de un reporte', () => {
  it(`el autor sube su foto JPEG de hasta ${PHOTO_MAX_BYTES} bytes`, async () => {
    await assertSucceeds(
      uploadBytes(ref(as.author.storage(), photoPath), bytes(PHOTO_MAX_BYTES), JPEG),
    );
  });

  it.each([
    ['sin sesión', () => uploadBytes(ref(as.anonymous.storage(), photoPath), bytes(1024), JPEG)],
    [
      'en la carpeta de otro usuario',
      () => uploadBytes(ref(as.other.storage(), photoPath), bytes(1024), JPEG),
    ],
    [
      'de más del límite',
      () => uploadBytes(ref(as.author.storage(), photoPath), bytes(PHOTO_MAX_BYTES + 1), JPEG),
    ],
    [
      'que no es JPEG',
      () =>
        uploadBytes(ref(as.author.storage(), photoPath), bytes(1024), { contentType: 'image/png' }),
    ],
    [
      'con un nombre que no es el ID del reporte',
      () =>
        uploadBytes(ref(as.author.storage(), `reports/${UIDS.author}/foto.jpg`), bytes(1024), JPEG),
    ],
  ])('no se sube %s', async (_case, upload) => {
    await assertFails(upload());
  });

  it('el autor no la reemplaza ni la borra: se sube una sola vez', async () => {
    await seedPhoto();
    await assertFails(uploadBytes(ref(as.author.storage(), photoPath), bytes(2048), JPEG));
    await assertFails(deleteObject(ref(as.author.storage(), photoPath)));
  });
});

describe('leer la foto', () => {
  it('la leen el autor y el operador; otro ciudadano no', async () => {
    await seedPhoto();
    await assertSucceeds(getBytes(ref(as.author.storage(), photoPath)));
    await assertSucceeds(getBytes(ref(as.operator.storage(), photoPath)));
    await assertFails(getBytes(ref(as.other.storage(), photoPath)));
  });
});

describe('miniaturas (solo las escribe la Function)', () => {
  const thumbPath = `thumbs/${REPORT_ID}.jpg`;

  it('cualquiera con sesión la lee; sin sesión no', async () => {
    await seedPhoto(thumbPath);
    await assertSucceeds(getBytes(ref(as.other.storage(), thumbPath)));
    await assertFails(getBytes(ref(as.anonymous.storage(), thumbPath)));
  });

  it('nadie la escribe desde el cliente, ni el operador', async () => {
    await assertFails(uploadBytes(ref(as.operator.storage(), thumbPath), bytes(1024), JPEG));
  });
});

describe('todo lo demás está cerrado', () => {
  it('ni el operador escribe fuera de reports/ y thumbs/', async () => {
    await assertFails(
      uploadBytes(ref(as.operator.storage(), 'publico/archivo.jpg'), bytes(10), JPEG),
    );
  });
});
