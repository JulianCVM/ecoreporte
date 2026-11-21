import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
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
  DISPLAY_NAME_MAX_CHARS,
  DISPLAY_NAME_MIN_CHARS,
} from '../../src/features/auth/domain/limits';
import { actors, createRulesEnv, REPORT_ID, UIDS } from './rules-test-env';

let env: RulesTestEnvironment;
let as: ReturnType<typeof actors>;

beforeAll(async () => {
  env = await createRulesEnv();
  as = actors(env);
});
afterEach(() => env.clearFirestore());
afterAll(() => env.cleanup());

/** Escribe con el Admin SDK simulado, como lo haría la Function. */
const seed = (path: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled(async (admin) => {
    await setDoc(doc(admin.firestore(), path), data);
  });

describe('evaluations: bitácora de la IA', () => {
  const evaluationPath = `reports/${REPORT_ID}/evaluations/eval1`;

  it('el operador la lee; el autor del reporte no', async () => {
    await seed(evaluationPath, { model: 'mock', latencyMs: 120 });
    await assertSucceeds(getDoc(doc(as.operator.firestore(), evaluationPath)));
    await assertFails(getDoc(doc(as.author.firestore(), evaluationPath)));
  });

  it('nadie la escribe desde el cliente, ni el operador', async () => {
    await assertFails(setDoc(doc(as.operator.firestore(), evaluationPath), { model: 'falso' }));
    await assertFails(setDoc(doc(as.author.firestore(), evaluationPath), { model: 'falso' }));
  });
});

describe('alerts: alertas para operadores', () => {
  const alertPath = 'alerts/alert1';
  const openAlert = {
    reportId: REPORT_ID,
    category: 'escombros',
    complexity: 'alta',
    location: new GeoPoint(7.1193, -73.1227),
    createdAt: Timestamp.now(),
    status: 'open',
  };
  const acknowledge = (who = as.operator, by: string = UIDS.operator, status = 'acknowledged') =>
    updateDoc(doc(who.firestore(), alertPath), {
      status,
      acknowledgedBy: by,
      acknowledgedAt: serverTimestamp(),
    });

  it('el operador la lee; un ciudadano no', async () => {
    await seed(alertPath, openAlert);
    await assertSucceeds(getDoc(doc(as.operator.firestore(), alertPath)));
    await assertFails(getDoc(doc(as.author.firestore(), alertPath)));
  });

  it('el operador la toma a su nombre', async () => {
    await seed(alertPath, openAlert);
    await assertSucceeds(acknowledge());
  });

  it('no la toma a nombre de otro ni la cierra sin tomarla', async () => {
    await seed(alertPath, openAlert);
    await assertFails(acknowledge(as.operator, UIDS.other));
    await assertFails(acknowledge(as.operator, UIDS.operator, 'closed'));
  });

  it('no cambia los datos de la alerta', async () => {
    await seed(alertPath, openAlert);
    await assertFails(updateDoc(doc(as.operator.firestore(), alertPath), { complexity: 'baja' }));
  });

  it('nadie la crea ni la borra desde el cliente (solo la Function)', async () => {
    await assertFails(addDoc(collection(as.operator.firestore(), 'alerts'), openAlert));
    await seed(alertPath, openAlert);
    await assertFails(deleteDoc(doc(as.operator.firestore(), alertPath)));
  });

  it('un ciudadano no la toma', async () => {
    await seed(alertPath, openAlert);
    await assertFails(acknowledge(as.author, UIDS.author));
  });
});

describe('users: perfil de cada usuario', () => {
  const ownPath = `users/${UIDS.author}`;
  const profile = (overrides: Record<string, unknown> = {}) => ({
    displayName: 'Ana Prueba',
    createdAt: serverTimestamp(),
    ...overrides,
  });

  it('cada quien crea, lee y edita el suyo', async () => {
    const own = doc(as.author.firestore(), ownPath);
    await assertSucceeds(setDoc(own, profile()));
    await assertSucceeds(getDoc(own));
    await assertSucceeds(updateDoc(own, { displayName: 'Ana P.' }));
  });

  it('nadie crea ni lee el perfil de otro', async () => {
    await assertFails(setDoc(doc(as.other.firestore(), ownPath), profile()));
    await seed(ownPath, { displayName: 'Ana Prueba' });
    await assertFails(getDoc(doc(as.other.firestore(), ownPath)));
  });

  it('el cliente no escribe reportsToday (es de la Function)', async () => {
    await assertFails(
      setDoc(
        doc(as.author.firestore(), ownPath),
        profile({ reportsToday: { date: 'x', count: 0 } }),
      ),
    );
    await seed(ownPath, {
      displayName: 'Ana Prueba',
      reportsToday: { date: '2026-11-21', count: 3 },
    });
    await assertFails(
      updateDoc(doc(as.author.firestore(), ownPath), {
        reportsToday: { date: '2026-11-21', count: 0 },
      }),
    );
  });

  it('el rol no se puede guardar en el perfil: va en los custom claims', async () => {
    await assertFails(setDoc(doc(as.author.firestore(), ownPath), profile({ role: 'operator' })));
  });

  it('acepta hasta 5 tokens de FCM, no 6', async () => {
    const tokens = (n: number) => Array.from({ length: n }, (_, i) => `token-${i}`);
    const own = doc(as.author.firestore(), ownPath);
    await assertSucceeds(setDoc(own, profile({ fcmTokens: tokens(5) })));
    await assertFails(updateDoc(own, { fcmTokens: tokens(6) }));
  });

  it(`el nombre tiene entre ${DISPLAY_NAME_MIN_CHARS} y ${DISPLAY_NAME_MAX_CHARS} caracteres`, async () => {
    const own = doc(as.author.firestore(), ownPath);
    await assertSucceeds(setDoc(own, profile({ displayName: 'a'.repeat(DISPLAY_NAME_MAX_CHARS) })));
    await assertFails(updateDoc(own, { displayName: 'a'.repeat(DISPLAY_NAME_MAX_CHARS + 1) }));
    await assertFails(updateDoc(own, { displayName: 'a'.repeat(DISPLAY_NAME_MIN_CHARS - 1) }));
    await assertFails(updateDoc(own, { displayName: 42 }));
  });

  it('nadie borra su perfil desde el cliente', async () => {
    await seed(ownPath, { displayName: 'Ana Prueba' });
    await assertFails(deleteDoc(doc(as.author.firestore(), ownPath)));
  });
});

describe('todo lo demás está cerrado', () => {
  it('ni el operador lee o escribe una colección que no está en las reglas', async () => {
    await assertFails(setDoc(doc(as.operator.firestore(), 'config/app'), { open: true }));
    await assertFails(getDoc(doc(as.operator.firestore(), 'config/app')));
  });
});
