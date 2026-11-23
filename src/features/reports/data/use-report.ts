import { useEffect, useState } from 'react';

import { db, doc, onSnapshot } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { parseReportDetail, type ReportDetail } from '../domain/report-detail';

export type ReportState =
  | { status: 'loading' }
  | { status: 'ready'; report: ReportDetail }
  /** El reporte no existe o su documento no tiene la forma esperada. */
  | { status: 'missing' }
  | { status: 'error'; message: string };

/** Un reporte en vivo para la pantalla de detalle (RF06). Sin conexión responde del disco. */
export function useReport(reportId: string): ReportState {
  const [state, setState] = useState<ReportState>({ status: 'loading' });

  useEffect(() => {
    return onSnapshot(
      doc(db(), 'reports', reportId),
      (snapshot) => {
        const report = parseReportDetail(snapshot.id, snapshot.data());
        setState(report ? { status: 'ready', report } : { status: 'missing' });
      },
      (cause) => {
        reportError(`[reports] falló el listener del reporte ${reportId}`, cause);
        setState({ status: 'error', message: cause.message });
      },
    );
  }, [reportId]);

  return state;
}
