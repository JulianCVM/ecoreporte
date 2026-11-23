import { setTimeout as sleep } from 'node:timers/promises';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

import { createClassifier } from './ai/create-classifier';
import { geminiApiKey, params, readServerConfig, REGION, reportsBucket } from './config';
import { FirestoreTokenStore } from './notifications/firestore-token-store';
import { notifyOperatorsOfAlert, notifyStatusChange } from './notifications/notify';
import { FcmPushSender } from './notifications/push-sender';
import { classifyUploadedPhoto } from './reports/classify-uploaded-photo';
import { FirestoreReportStore } from './reports/firestore-report-store';

initializeApp();

// Todas las funciones corren en la región de los datos (ADR 0005).
setGlobalOptions({ region: REGION });

/**
 * RF02 y RF04: al llegar la foto de un reporte a Storage, la clasifica y escribe el veredicto.
 * Tiene su propio `maxInstances` (RNF04) para acotar la concurrencia y el costo de la IA.
 */
export const classifyReportPhoto = onObjectFinalized(
  { bucket: reportsBucket, maxInstances: params.aiMaxInstances, secrets: [geminiApiKey] },
  async (event) => {
    const config = readServerConfig();
    const { bucket, name: photoPath } = event.data;
    const result = await classifyUploadedPhoto(photoPath, {
      store: new FirestoreReportStore(getFirestore()),
      classifier: createClassifier(config, {
        geminiApiKey: () => geminiApiKey.value(),
        projectId: process.env.GCLOUD_PROJECT,
      }),
      config,
      readPhoto: async (path) => {
        const [bytes] = await getStorage().bucket(bucket).file(path).download();
        return bytes;
      },
      nowMs: () => Date.now(),
      sleep: (ms) => sleep(ms),
    });
    console.info(`[classify] ${photoPath}`, result);
  },
);

/**
 * RF08: avisa al autor cuando su reporte cambia de estado, lo haya movido la IA o el operador.
 * El aviso es un extra: si FCM falla, el error se registra y el cambio de estado queda igual.
 */
export const onReportStatusChange = onDocumentUpdated('reports/{reportId}', async (event) => {
  const { reportId } = event.params;
  try {
    const result = await notifyStatusChange(
      reportId,
      event.data?.before.data(),
      event.data?.after.data(),
      {
        fcmEnabled: readServerConfig().fcmEnabled,
        sender: new FcmPushSender(getMessaging()),
        tokens: new FirestoreTokenStore(getFirestore()),
      },
    );
    console.info(`[push] reporte ${reportId}: ${result}`);
  } catch (error) {
    console.error(`[push] no se pudo avisar el cambio del reporte ${reportId}`, error);
  }
});

/** RF03: avisa al tema de los operadores cuando se crea una alerta (ADR 0006). */
export const onAlertCreated = onDocumentCreated('alerts/{alertId}', async (event) => {
  const { alertId } = event.params;
  try {
    const result = await notifyOperatorsOfAlert(event.data?.data(), {
      fcmEnabled: readServerConfig().fcmEnabled,
      sender: new FcmPushSender(getMessaging()),
    });
    console.info(`[push] alerta ${alertId}: ${result}`);
  } catch (error) {
    console.error(`[push] no se pudo avisar la alerta ${alertId}`, error);
  }
});
