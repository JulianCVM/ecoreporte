import { LOCATION_MAX_ACCURACY_M, NOTE_MAX_CHARS, PHOTO_MAX_BYTES } from '../limits';
import { buildNewReport, draftProblem, photoStoragePath, type ReportDraft } from '../new-report';

const REPORT_ID = 'AbCdEfGhIjKlMnOpQrSt';
const identity = { id: REPORT_ID, authorUid: 'uid-1', capturedAtMs: 1_795_000_000_000 };

const draft = (overrides: Partial<ReportDraft> = {}): ReportDraft => ({
  photo: { uri: 'file:///cache/foto.jpg', widthPx: 1600, heightPx: 1200, bytes: 400_000 },
  reading: { latitude: 7.11935, longitude: -73.12274, accuracyM: 12 },
  note: '',
  ...overrides,
});

describe('draftProblem', () => {
  it('un borrador con foto y ubicación precisa se puede enviar', () => {
    expect(draftProblem(draft())).toBeNull();
  });

  it('dice qué falta, en orden: primero la foto y después la ubicación', () => {
    expect(draftProblem(draft({ photo: null, reading: null }))).toMatch(/foto/);
    expect(draftProblem(draft({ reading: null }))).toMatch(/ubicación/);
  });

  it('no deja enviar con precisión peor que el límite ni sin radio de error', () => {
    const imprecise = { latitude: 7, longitude: -73, accuracyM: LOCATION_MAX_ACCURACY_M + 1 };
    expect(draftProblem(draft({ reading: imprecise }))).toMatch(/precisión/);
    expect(draftProblem(draft({ reading: { ...imprecise, accuracyM: null } }))).toMatch(
      /precisión/,
    );
  });

  it('no deja enviar una foto por encima del límite de storage.rules', () => {
    const heavy = {
      uri: 'file:///f.jpg',
      widthPx: 1600,
      heightPx: 1200,
      bytes: PHOTO_MAX_BYTES + 1,
    };
    expect(draftProblem(draft({ photo: heavy }))).toMatch(/pesa/);
  });

  it('la nota cuenta sin los espacios de los extremos', () => {
    expect(draftProblem(draft({ note: ` ${'a'.repeat(NOTE_MAX_CHARS)} ` }))).toBeNull();
    expect(draftProblem(draft({ note: 'a'.repeat(NOTE_MAX_CHARS + 1) }))).toMatch(/nota/);
  });
});

describe('buildNewReport', () => {
  it('arma el documento con la ruta de la foto atada al autor y al reporte', () => {
    const report = buildNewReport(draft({ note: '  Bolsas rotas en la esquina  ' }), identity);

    expect(report).toEqual({
      id: REPORT_ID,
      authorUid: 'uid-1',
      capturedAtMs: identity.capturedAtMs,
      latitude: 7.11935,
      longitude: -73.12274,
      accuracyM: 12,
      note: 'Bolsas rotas en la esquina',
      photo: { path: `reports/uid-1/${REPORT_ID}.jpg`, width: 1600, height: 1200, bytes: 400_000 },
      localPhotoUri: 'file:///cache/foto.jpg',
    });
    expect(report.photo.path).toBe(photoStoragePath('uid-1', REPORT_ID));
  });

  it('una nota vacía no viaja: las reglas la tratan como opcional', () => {
    expect(buildNewReport(draft({ note: '   ' }), identity).note).toBeNull();
  });

  it('se niega a armar un borrador incompleto', () => {
    expect(() => buildNewReport(draft({ photo: null }), identity)).toThrow(/Falta la foto/);
  });

  it('rechaza un ID que storage.rules no aceptaría como nombre de archivo', () => {
    expect(() => buildNewReport(draft(), { ...identity, id: 'corto' })).toThrow(/ID de reporte/);
  });
});
