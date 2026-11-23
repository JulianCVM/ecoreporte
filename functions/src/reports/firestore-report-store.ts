import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { z } from 'zod';

import type { Evaluation, FinalOutcome, ReportStore, StartResult } from './report-store';

const REPORTS = 'reports';
const EVALUATIONS = 'evaluations';
/** Quién movió el estado en `statusHistory` cuando fue una función. */
const SYSTEM_ACTOR = 'system';

/** Lo que la función necesita leer del reporte; lo escribió el cliente, así que se valida. */
const pendingReportSchema = z.object({
  authorUid: z.string(),
  status: z.string(),
  photo: z.object({ path: z.string() }),
});

const historyEntry = (status: string, atMs: number, reason?: string | null) => ({
  status,
  by: SYSTEM_ACTOR,
  at: Timestamp.fromMillis(atMs),
  ...(reason ? { reason } : {}),
});

/** `ReportStore` sobre Firestore con el Admin SDK (las reglas no aplican). */
export class FirestoreReportStore implements ReportStore {
  constructor(private readonly db: Firestore) {}

  startProcessing(
    reportId: string,
    expected: { authorUid: string; photoPath: string },
    atMs: number,
  ): Promise<StartResult> {
    const reference = this.db.collection(REPORTS).doc(reportId);
    return this.db.runTransaction(async (transaction): Promise<StartResult> => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return 'missing';
      const report = pendingReportSchema.safeParse(snapshot.data());
      if (
        !report.success ||
        report.data.authorUid !== expected.authorUid ||
        report.data.photo.path !== expected.photoPath
      ) {
        return 'mismatch';
      }
      if (report.data.status !== 'pending_upload') return 'not_pending';
      transaction.update(reference, {
        status: 'processing_ai',
        statusHistory: FieldValue.arrayUnion(historyEntry('processing_ai', atMs)),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'started';
    });
  }

  async saveEvaluation(reportId: string, evaluation: Evaluation): Promise<void> {
    const { atMs, ...fields } = evaluation;
    await this.db
      .collection(REPORTS)
      .doc(reportId)
      .collection(EVALUATIONS)
      .add({ ...fields, createdAt: Timestamp.fromMillis(atMs) });
  }

  async finish(reportId: string, outcome: FinalOutcome, atMs: number): Promise<void> {
    await this.db
      .collection(REPORTS)
      .doc(reportId)
      .update({
        status: outcome.status,
        statusHistory: FieldValue.arrayUnion(historyEntry(outcome.status, atMs, outcome.reason)),
        updatedAt: FieldValue.serverTimestamp(),
        ...(outcome.ai ? { ai: { ...outcome.ai, evaluatedAt: Timestamp.fromMillis(atMs) } } : {}),
      });
  }
}
