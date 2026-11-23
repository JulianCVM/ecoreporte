import { setTimeout as sleep } from 'node:timers/promises';

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onObjectFinalized } from 'firebase-functions/v2/storage';

import { createClassifier } from './ai/create-classifier';
import { geminiApiKey, params, readServerConfig, REGION, reportsBucket } from './config';
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
