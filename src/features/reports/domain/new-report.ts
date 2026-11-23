import { NOTE_MAX_CHARS } from './limits';
import { isPhotoWithinLimit, type EncodedPhoto } from './photo-compression';
import { canSubmitLocation, type LocationReading } from './report-location';

/** IDs que genera Firestore; `storage.rules` exige este formato en el nombre de la foto. */
const REPORT_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

/** Lo que el usuario reunió en la pantalla Reportar. */
export type ReportDraft = {
  photo: EncodedPhoto | null;
  reading: LocationReading | null;
  note: string;
};

/** Reporte listo para escribirse en `reports/{id}` (docs/03-modelo-de-datos.md). */
export type NewReport = {
  id: string;
  authorUid: string;
  capturedAtMs: number;
  latitude: number;
  longitude: number;
  accuracyM: number;
  note: string | null;
  photo: { path: string; width: number; height: number; bytes: number };
  /** Archivo local de la foto, que entra a la cola de subida. No va al documento. */
  localPhotoUri: string;
};

/** Ruta de la foto en Storage; las reglas la atan al autor y al reporte. */
export function photoStoragePath(authorUid: string, reportId: string): string {
  return `reports/${authorUid}/${reportId}.jpg`;
}

/**
 * Qué le falta al borrador para poder enviarse, en palabras para el usuario.
 * `null` si está completo. Las reglas de Firestore validan lo mismo en el servidor.
 */
export function draftProblem(draft: ReportDraft): string | null {
  if (!draft.photo) return 'Falta la foto de los residuos.';
  if (!isPhotoWithinLimit(draft.photo.bytes)) return 'La foto pesa más de lo permitido.';
  if (!draft.reading) return 'Falta la ubicación.';
  if (!canSubmitLocation(draft.reading)) {
    return 'La precisión de la ubicación no alcanza. Sal a un lugar abierto y espera unos segundos.';
  }
  if (draft.note.trim().length > NOTE_MAX_CHARS) {
    return `La nota no puede pasar de ${NOTE_MAX_CHARS} caracteres.`;
  }
  return null;
}

/**
 * Arma el reporte a partir del borrador.
 *
 * @param identity ID generado por Firestore, autor y hora del teléfono al enviar.
 * @throws Error si el borrador está incompleto (`draftProblem`) o el ID no es válido.
 */
export function buildNewReport(
  draft: ReportDraft,
  identity: { id: string; authorUid: string; capturedAtMs: number },
): NewReport {
  const problem = draftProblem(draft);
  const { photo, reading } = draft;
  if (problem || !photo || !reading || reading.accuracyM == null) {
    throw new Error(`El reporte no se puede enviar: ${problem ?? 'borrador incompleto'}`);
  }
  if (!REPORT_ID_PATTERN.test(identity.id)) {
    throw new Error(`ID de reporte inválido: ${identity.id}`);
  }
  const note = draft.note.trim();
  return {
    id: identity.id,
    authorUid: identity.authorUid,
    capturedAtMs: identity.capturedAtMs,
    latitude: reading.latitude,
    longitude: reading.longitude,
    accuracyM: reading.accuracyM,
    note: note.length > 0 ? note : null,
    photo: {
      path: photoStoragePath(identity.authorUid, identity.id),
      width: photo.widthPx,
      height: photo.heightPx,
      bytes: photo.bytes,
    },
    localPhotoUri: photo.uri,
  };
}
