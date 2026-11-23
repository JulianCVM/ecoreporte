import { canTransition } from '@/features/reports/domain/report-status';
import type { ReportStatus } from '@/features/reports/domain/types';
import { arrayUnion, db, doc, serverTimestamp, Timestamp, updateDoc } from '@/lib/firebase';

/**
 * Cambia el estado de un reporte como operador y deja el rastro en `statusHistory` (RF07).
 * Las reglas de Firestore validan el rol y la transición: esta comprobación solo evita un
 * viaje al servidor que se sabe perdido.
 *
 * @throws Error si la transición no es del operador o si el servidor la rechaza.
 */
export async function changeReportStatus(
  reportId: string,
  from: ReportStatus,
  to: ReportStatus,
): Promise<void> {
  if (!canTransition('operator', from, to)) {
    throw new Error(`Un operador no puede pasar el reporte ${reportId} de ${from} a ${to}`);
  }
  await updateDoc(doc(db(), 'reports', reportId), {
    status: to,
    // `arrayUnion` no acepta `serverTimestamp()` dentro de un elemento: va la hora del teléfono.
    statusHistory: arrayUnion({ status: to, by: 'operator', at: Timestamp.now() }),
    updatedAt: serverTimestamp(),
  });
}
