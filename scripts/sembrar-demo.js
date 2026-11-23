#!/usr/bin/env node
/**
 * Siembra datos de demostración en la Emulator Suite: dos ciudadanos, un operador y reportes
 * en todos los estados alrededor del centro de Bucaramanga, con su foto, su veredicto y sus
 * alertas.
 *
 *   npm run emulators          (en otra terminal)
 *   npm run emulators:demo
 *
 * Solo habla con los emuladores: usa su API REST con el token `owner`, que un proyecto real no
 * acepta. Se puede correr varias veces: los ID son fijos y cada corrida reescribe lo mismo.
 * La foto es un dibujo (`scripts/demo/foto-de-prueba.jpg`): no hay fotos de personas reales.
 */
const fs = require('node:fs');
const path = require('node:path');
const { geohashForLocation } = require('geofire-common');

const HOST = process.env.EMULATOR_HOST ?? '127.0.0.1';
const PROJECT_ID = process.env.GCLOUD_PROJECT ?? 'ecoreporte-dev';
const BUCKET = process.env.REPORTS_BUCKET ?? `${PROJECT_ID}.firebasestorage.app`;
const AUTH = `http://${HOST}:9099/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`;
const FIRESTORE = `http://${HOST}:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const STORAGE = `http://${HOST}:9199/v0/b/${BUCKET}/o`;
const OWNER = { Authorization: 'Bearer owner' };

// Contraseña de las cuentas de demostración. No es un secreto: solo existe en el emulador.
const DEMO_PASSWORD = 'EcoReporte123';
const ACCOUNTS = [
  { key: 'ana', email: 'ana@example.com', displayName: 'Ana Ciudadana', role: null },
  { key: 'luis', email: 'luis@example.com', displayName: 'Luis Vecino', role: null },
  {
    key: 'operador',
    email: 'operador@example.com',
    displayName: 'Olga Operadora',
    role: 'operator',
  },
];

const CENTER = { latitude: 7.11935, longitude: -73.12274 };
const GEOHASH_PRECISION = 9; // Igual a src/lib/geo/geohash.ts y a firestore.rules.
const PHOTO = fs.readFileSync(path.join(__dirname, 'demo', 'foto-de-prueba.jpg'));
const MINUTE_MS = 60_000;

const AI = {
  bolsas: {
    category: 'via_publica',
    complexity: 'baja',
    confidence: 0.93,
    summary: 'Bolsas de basura sobre el andén.',
  },
  escombros: {
    category: 'escombros',
    complexity: 'alta',
    confidence: 0.9,
    summary: 'Montón grande de escombros que ocupa parte de la vía.',
  },
  domiciliario: {
    category: 'domiciliario_ilegal',
    complexity: 'media',
    confidence: 0.88,
    summary: 'Residuos de un local sacados fuera del horario de recolección.',
  },
  dudoso: {
    category: 'domiciliario_ilegal',
    complexity: 'media',
    confidence: 0.62,
    summary: 'Posibles residuos domiciliarios; la foto no es clara.',
  },
  nada: {
    category: 'sin_residuo',
    complexity: 'baja',
    confidence: 0.95,
    summary: 'No se ven residuos en la foto.',
  },
};

/**
 * Reportes de la demostración. `north` y `east` son metros desde el centro; `ageMin`, hace
 * cuántos minutos se tomó la foto; `steps`, los estados por los que pasó después de crearse.
 */
const REPORTS = [
  {
    id: 'demoReporte000000001',
    author: 'ana',
    north: 120,
    east: -80,
    ageMin: 180,
    note: 'Bolsas rotas en la esquina',
    ai: 'bolsas',
    steps: ['approved'],
  },
  {
    id: 'demoReporte000000002',
    author: 'ana',
    north: -350,
    east: 420,
    ageMin: 150,
    note: 'Escombros de una obra',
    ai: 'escombros',
    steps: ['approved'],
  },
  {
    id: 'demoReporte000000003',
    author: 'luis',
    north: 800,
    east: 300,
    ageMin: 300,
    note: null,
    ai: 'domiciliario',
    steps: ['approved', 'in_progress'],
  },
  {
    id: 'demoReporte000000004',
    author: 'luis',
    north: -900,
    east: -700,
    ageMin: 900,
    note: 'Colchón abandonado',
    ai: 'escombros',
    steps: ['approved', 'in_progress', 'resolved'],
  },
  {
    id: 'demoReporte000000005',
    author: 'ana',
    north: 1500,
    east: -1200,
    ageMin: 1440,
    note: null,
    ai: 'bolsas',
    steps: ['approved', 'in_progress', 'resolved'],
  },
  {
    id: 'demoReporte000000006',
    author: 'luis',
    north: 400,
    east: 1700,
    ageMin: 90,
    note: 'Frente al parque',
    ai: 'bolsas',
    steps: ['approved'],
  },
  {
    id: 'demoReporte000000007',
    author: 'ana',
    north: -200,
    east: -300,
    ageMin: 40,
    note: 'No sé si cuenta',
    ai: 'dudoso',
    steps: ['needs_review'],
  },
  {
    id: 'demoReporte000000008',
    author: 'luis',
    north: 600,
    east: -500,
    ageMin: 30,
    note: null,
    ai: null,
    steps: ['needs_review'],
    reason: 'ai_failed',
  },
  {
    id: 'demoReporte000000009',
    author: 'ana',
    north: 50,
    east: 60,
    ageMin: 20,
    note: 'Foto de prueba',
    ai: 'nada',
    steps: ['rejected'],
  },
  // Fuera del radio del mapa (unos 6 km): no debe aparecer.
  {
    id: 'demoReporte000000010',
    author: 'luis',
    north: 6000,
    east: 0,
    ageMin: 200,
    note: 'Lejos del centro',
    ai: 'bolsas',
    steps: ['approved'],
  },
];

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(
      `${options.method} ${url} respondió ${response.status}: ${await response.text()}`,
    );
  }
  return response.json();
}

const post = (url, body) =>
  request(url, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Crea la cuenta o reutiliza la que ya existe, y le pone su rol. */
async function ensureAccount({ email, displayName, role }) {
  const { users } = await post(`${AUTH}/accounts:lookup`, { email: [email] });
  const localId =
    users?.[0]?.localId ??
    (await post(`${AUTH}/accounts`, { email, password: DEMO_PASSWORD, displayName })).localId;
  await post(`${AUTH}/accounts:update`, {
    localId,
    customAttributes: JSON.stringify(role ? { role } : {}),
  });
  return localId;
}

/** Convierte un valor de JavaScript al formato de la API REST de Firestore. */
function toValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if ('geoPoint' in value) return { geoPointValue: value.geoPoint };
  return { mapValue: { fields: toFields(value) } };
}

const toFields = (data) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toValue(value)]));

const writeDocument = (documentPath, data) =>
  request(`${FIRESTORE}/${documentPath}`, {
    method: 'PATCH',
    headers: { ...OWNER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: toFields(data) }),
  });

const uploadPhoto = (photoPath) =>
  request(`${STORAGE}?uploadType=media&name=${encodeURIComponent(photoPath)}`, {
    method: 'POST',
    headers: { ...OWNER, 'Content-Type': 'image/jpeg' },
    body: PHOTO,
  });

/** Desplaza el centro `north` y `east` metros. Un grado de latitud son unos 111 320 m. */
function offset({ north, east }) {
  const METERS_PER_DEGREE = 111_320;
  const latitude = CENTER.latitude + north / METERS_PER_DEGREE;
  const longitude =
    CENTER.longitude + east / (METERS_PER_DEGREE * Math.cos((CENTER.latitude * Math.PI) / 180));
  return { latitude, longitude };
}

async function seedReport(report, uids, nowMs) {
  const authorUid = uids[report.author];
  const capturedAt = new Date(nowMs - report.ageMin * MINUTE_MS);
  const location = offset(report);
  const photoPath = `reports/${authorUid}/${report.id}.jpg`;
  const ai = report.ai ? AI[report.ai] : null;
  const status = report.steps.at(-1);

  // La Function firma el análisis y el veredicto; el operador, lo que viene después.
  const history = [{ status: 'processing_ai', by: 'system' }];
  report.steps.forEach((step, index) => {
    const entry = { status: step, by: index === 0 ? 'system' : 'operator' };
    history.push(index === 0 && report.reason ? { ...entry, reason: report.reason } : entry);
  });
  const stepMs = (report.ageMin * MINUTE_MS) / (history.length + 1);
  const statusHistory = history.map((entry, index) => ({
    ...entry,
    at: new Date(capturedAt.getTime() + (index + 1) * stepMs),
  }));
  const updatedAt = statusHistory.at(-1).at;

  await uploadPhoto(photoPath);
  await writeDocument(`reports/${report.id}`, {
    authorUid,
    status,
    createdAt: capturedAt,
    capturedAt,
    location: { geoPoint: location },
    locationAccuracyM: 8,
    geohash: geohashForLocation([location.latitude, location.longitude], GEOHASH_PRECISION),
    ...(report.note ? { note: report.note } : {}),
    photo: { path: photoPath, width: 96, height: 72, bytes: PHOTO.length },
    ...(ai
      ? {
          ai: {
            ...ai,
            containsPeople: false,
            model: 'mock',
            promptVersion: 'v1',
            latencyMs: 0,
            evaluatedAt: statusHistory[1].at,
          },
        }
      : {}),
    statusHistory,
    updatedAt,
  });

  // Igual que la Function: complejidad alta y no rechazado crea una alerta (RF03).
  if (ai?.complexity === 'alta' && status !== 'rejected') {
    await writeDocument(`alerts/${report.id}`, {
      reportId: report.id,
      category: ai.category,
      complexity: ai.complexity,
      location: { geoPoint: location },
      status: status === 'resolved' ? 'closed' : 'open',
      createdAt: statusHistory[1].at,
    });
  }
}

async function main() {
  const nowMs = Date.now();
  const uids = {};
  for (const account of ACCOUNTS) {
    uids[account.key] = await ensureAccount(account);
    await writeDocument(`users/${uids[account.key]}`, {
      displayName: account.displayName,
      createdAt: new Date(nowMs),
    });
  }
  for (const report of REPORTS) await seedReport(report, uids, nowMs);

  console.log(`Listo: ${ACCOUNTS.length} cuentas y ${REPORTS.length} reportes en ${PROJECT_ID}.`);
  for (const { email, role } of ACCOUNTS) {
    console.log(`  ${email} · ${role ?? 'ciudadano'} · contraseña ${DEMO_PASSWORD}`);
  }
}

main().catch((error) => {
  console.error(`No se pudo sembrar la demostración: ${error.message}`);
  console.error('¿Están arriba los emuladores? (npm run emulators)');
  process.exitCode = 1;
});
