import {
  collection,
  db,
  doc,
  GeoPoint,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from '@/lib/firebase';
import { encodeGeohash } from '@/lib/geo/geohash';

import { buildNewReport, type NewReport, type ReportDraft } from '../domain/new-report';
import { dequeueUpload, enqueueUpload } from './upload-queue';
import { storeQueuedPhoto } from './upload-queue-store';

const REPORTS = 'reports';

/** Campos de `reports/{id}` que escribe la app al crear (docs/03-modelo-de-datos.md). */
function toDocument(report: NewReport) {
  return {
    authorUid: report.authorUid,
    status: 'pending_upload',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    capturedAt: Timestamp.fromMillis(report.capturedAtMs),
    location: new GeoPoint(report.latitude, report.longitude),
    locationAccuracyM: report.accuracyM,
    geohash: encodeGeohash(report),
    photo: report.photo,
    // Las reglas tratan la nota como opcional: si no hay, el campo no viaja.
    ...(report.note ? { note: report.note } : {}),
  };
}

/**
 * Crea el reporte en `pending_upload` y deja su foto en la cola de subida (RF01b, ADR 0004).
 *
 * Funciona sin conexión: Firestore guarda el documento en disco y lo sincroniza solo, así que
 * la escritura no se espera (sin red, su promesa no termina hasta que vuelve la señal).
 *
 * @param capturedAtMs Hora del teléfono al tomar la foto.
 * @returns El ID del reporte.
 * @throws Error si el borrador está incompleto o la foto no se pudo copiar a la cola.
 */
export function submitReport(draft: ReportDraft, authorUid: string, capturedAtMs: number): string {
  const reference = doc(collection(db(), REPORTS));
  const report = buildNewReport(draft, { id: reference.id, authorUid, capturedAtMs });
  const localUri = storeQueuedPhoto(report.localPhotoUri, report.id);

  // El documento va antes que la foto: así la Function encuentra el reporte cuando la foto
  // llega a Storage.
  setDoc(reference, toDocument(report)).catch((cause: unknown) => {
    // Las reglas lo rechazaron al sincronizar: sin reporte, la foto no debe subir.
    console.error(`[reports] el servidor rechazó el reporte ${report.id}`, cause);
    dequeueUpload(report.id);
  });
  enqueueUpload({
    reportId: report.id,
    authorUid,
    storagePath: report.photo.path,
    localUri,
  });
  return report.id;
}

/**
 * El autor cancela un reporte que sigue en `pending_upload`: la foto sale de la cola y el
 * documento pasa a `cancelled`. Las reglas niegan la cancelación en cualquier otro estado.
 */
export function cancelReport(reportId: string): void {
  dequeueUpload(reportId);
  updateDoc(doc(db(), REPORTS, reportId), {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  }).catch((cause: unknown) => {
    console.error(`[reports] no se pudo cancelar el reporte ${reportId}`, cause);
  });
}
