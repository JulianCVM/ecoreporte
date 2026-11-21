import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  GeoPoint,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import {
  LOCATION_MAX_ACCURACY_M,
  NOTE_MAX_CHARS,
  PHOTO_MAX_BYTES,
} from '../../src/features/reports/domain/limits';
import { canTransition } from '../../src/features/reports/domain/report-status';
import { REPORT_STATUSES, type ReportStatus } from '../../src/features/reports/domain/types';
import { actors, createRulesEnv, REPORT_ID, UIDS } from './rules-test-env';

let env: RulesTestEnvironment;
let as: ReturnType<typeof actors>;

beforeAll(async () => {
  env = await createRulesEnv();
  as = actors(env);
});
afterEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

const reportPath = `reports/${REPORT_ID}`;

/** Reporte que la app crea al tomar la foto (docs/03-modelo-de-datos.md). */
function newReport(overrides: Record<string, unknown> = {}) {
  return {
    authorUid: UIDS.author,
    status: 'pending_upload',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    capturedAt: Timestamp.fromDate(new Date('2026-11-21T10:00:00Z')),
    location: new GeoPoint(7.1193, -73.1227),
    locationAccuracyM: 12,
    geohash: 'd65f0c8ft',
    note: 'Bolsas junto al andén',
    photo: {
      path: `reports/${UIDS.author}/${REPORT_ID}.jpg`,
      width: 1600,
      height: 1200,
      bytes: 350_000,
    },
    ...overrides,
  };
}

/** Deja un reporte guardado en el estado pedido, como lo dejaría la Function. */
function seedReport(status: ReportStatus, extra: Record<string, unknown> = {}) {
  return env.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), reportPath), {
      ...newReport({ createdAt: Timestamp.now(), updatedAt: Timestamp.now() }),
      status,
      ...extra,
    });
  });
}

describe('crear un reporte', () => {
  it('el autor crea el suyo en pending_upload', async () => {
    await assertSucceeds(setDoc(doc(as.author.firestore(), reportPath), newReport()));
  });

  it(`acepta la precisión justo en el límite (${LOCATION_MAX_ACCURACY_M} m)`, async () => {
    const report = newReport({ locationAccuracyM: LOCATION_MAX_ACCURACY_M });
    await assertSucceeds(setDoc(doc(as.author.firestore(), reportPath), report));
  });

  it('nadie crea un reporte sin sesión', async () => {
    await assertFails(setDoc(doc(as.anonymous.firestore(), reportPath), newReport()));
  });

  it.each([
    ['a nombre de otro usuario', { authorUid: UIDS.other }],
    ['en un estado que no es pending_upload', { status: 'approved' }],
    ['con el campo ai (solo lo escribe la Function)', { ai: { category: 'escombros' } }],
    ['con statusHistory', { statusHistory: [] }],
    [
      `con precisión peor que ${LOCATION_MAX_ACCURACY_M} m`,
      { locationAccuracyM: LOCATION_MAX_ACCURACY_M + 1 },
    ],
    [`con nota de más de ${NOTE_MAX_CHARS} caracteres`, { note: 'x'.repeat(NOTE_MAX_CHARS + 1) }],
    ['con la hora del teléfono en createdAt', { createdAt: Timestamp.now() }],
    ['con un geohash que no tiene 9 caracteres', { geohash: 'd65f0' }],
    [
      'con la foto de otro reporte',
      {
        photo: {
          path: `reports/${UIDS.author}/otroReporte123456789.jpg`,
          width: 1,
          height: 1,
          bytes: 1,
        },
      },
    ],
    [
      `con una foto de más de ${PHOTO_MAX_BYTES} bytes`,
      {
        photo: {
          path: `reports/${UIDS.author}/${REPORT_ID}.jpg`,
          width: 1,
          height: 1,
          bytes: PHOTO_MAX_BYTES + 1,
        },
      },
    ],
  ])('el autor no puede crearlo %s', async (_case, overrides) => {
    await assertFails(setDoc(doc(as.author.firestore(), reportPath), newReport(overrides)));
  });
});

describe('leer un reporte', () => {
  it('el autor lee el suyo en cualquier estado', async () => {
    await seedReport('pending_upload');
    await assertSucceeds(getDoc(doc(as.author.firestore(), reportPath)));
  });

  it('otro ciudadano lee un reporte público, pero no uno en revisión', async () => {
    await seedReport('approved');
    await assertSucceeds(getDoc(doc(as.other.firestore(), reportPath)));
    await seedReport('needs_review');
    await assertFails(getDoc(doc(as.other.firestore(), reportPath)));
  });

  it('el operador lee cualquiera', async () => {
    await seedReport('pending_upload');
    await assertSucceeds(getDoc(doc(as.operator.firestore(), reportPath)));
  });

  it('sin sesión no se lee ni uno público', async () => {
    await seedReport('approved');
    await assertFails(getDoc(doc(as.anonymous.firestore(), reportPath)));
  });
});

describe('actualizar: el autor', () => {
  const edit = (fields: Record<string, unknown>) =>
    updateDoc(doc(as.author.firestore(), reportPath), { ...fields, updatedAt: serverTimestamp() });

  it('cambia la nota o cancela mientras la foto no se ha subido', async () => {
    await seedReport('pending_upload');
    await assertSucceeds(edit({ note: 'Ahora también hay escombros' }));
    await assertSucceeds(edit({ status: 'cancelled' }));
  });

  it('no cambia la nota cuando el reporte ya pasó a la IA', async () => {
    await seedReport('processing_ai');
    await assertFails(edit({ note: 'Tarde' }));
  });

  it('no escribe el veredicto de la IA', async () => {
    await seedReport('pending_upload');
    await assertFails(edit({ ai: { category: 'escombros', confidence: 0.99 } }));
  });

  it(`no deja una nota de más de ${NOTE_MAX_CHARS} caracteres`, async () => {
    await seedReport('pending_upload');
    await assertFails(edit({ note: 'x'.repeat(NOTE_MAX_CHARS + 1) }));
  });

  it('otro ciudadano no toca un reporte ajeno', async () => {
    await seedReport('pending_upload');
    await assertFails(
      updateDoc(doc(as.other.firestore(), reportPath), {
        note: 'Ajeno',
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe('actualizar: el operador', () => {
  const review = (fields: Record<string, unknown>, who = as.operator) =>
    updateDoc(doc(who.firestore(), reportPath), {
      status: 'approved',
      statusHistory: [{ status: 'approved', by: UIDS.operator, at: Timestamp.now() }],
      updatedAt: serverTimestamp(),
      ...fields,
    });

  it('aprueba un reporte en revisión dejando rastro', async () => {
    await seedReport('needs_review');
    await assertSucceeds(review({}));
  });

  it('no escribe ai junto con la transición', async () => {
    await seedReport('needs_review');
    await assertFails(review({ ai: { category: 'escombros' } }));
  });

  it('no deja un rastro de más de 20 cambios', async () => {
    await seedReport('needs_review');
    const history = Array.from({ length: 21 }, () => ({ status: 'approved', by: UIDS.operator }));
    await assertFails(review({ statusHistory: history }));
  });

  it('un ciudadano no hace transiciones de operador', async () => {
    await seedReport('needs_review');
    await assertFails(review({}, as.other));
  });
});

/**
 * Las reglas repiten la máquina de estados de report-status.ts. Esta prueba recorre todos los
 * pares (desde, hacia) y exige que las reglas y el dominio digan lo mismo: si cambia uno sin el
 * otro, falla la CI (issue #7).
 */
describe('las transiciones coinciden con report-status.ts', () => {
  const pairs = REPORT_STATUSES.flatMap((from) =>
    REPORT_STATUSES.filter((to) => to !== from).map((to) => [from, to] as const),
  );

  it.each(pairs)('operador: %s → %s', async (from, to) => {
    await seedReport(from);
    const attempt = updateDoc(doc(as.operator.firestore(), reportPath), {
      status: to,
      statusHistory: [{ status: to, by: UIDS.operator }],
      updatedAt: serverTimestamp(),
    });
    await (canTransition('operator', from, to) ? assertSucceeds(attempt) : assertFails(attempt));
  });

  it.each(pairs)('autor: %s → %s', async (from, to) => {
    await seedReport(from);
    const attempt = updateDoc(doc(as.author.firestore(), reportPath), {
      status: to,
      updatedAt: serverTimestamp(),
    });
    await (canTransition('author', from, to) ? assertSucceeds(attempt) : assertFails(attempt));
  });
});

describe('borrar', () => {
  it('ni el autor ni el operador borran reportes (solo la Function)', async () => {
    await seedReport('pending_upload');
    await assertFails(deleteDoc(doc(as.author.firestore(), reportPath)));
    await assertFails(deleteDoc(doc(as.operator.firestore(), reportPath)));
  });
});
