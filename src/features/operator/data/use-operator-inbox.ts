import { useEffect, useState } from 'react';

import { parseReportDetail, type ReportDetail } from '@/features/reports/domain/report-detail';
import { collection, db, limit, onSnapshot, orderBy, query, where } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { OPERATOR_INBOX_LIMIT } from '../domain/limits';
import { INBOX_STATUSES } from '../domain/operator-actions';

export type OperatorInboxState =
  | { status: 'loading' }
  | { status: 'ready'; reports: ReportDetail[] }
  | { status: 'error'; message: string };

/**
 * Reportes que esperan al operador, en vivo y del más reciente al más antiguo (RF07). Las
 * reglas solo dejan hacer esta consulta a quien tiene el claim de operador.
 */
export function useOperatorInbox(): OperatorInboxState {
  const [state, setState] = useState<OperatorInboxState>({ status: 'loading' });

  useEffect(() => {
    const waiting = query(
      collection(db(), 'reports'),
      where('status', 'in', [...INBOX_STATUSES]),
      orderBy('createdAt', 'desc'),
      limit(OPERATOR_INBOX_LIMIT),
    );
    return onSnapshot(
      waiting,
      (snapshot) => {
        const reports = snapshot.docs.flatMap((document) => {
          const report = parseReportDetail(document.id, document.data());
          if (report) return [report];
          reportError(`[operator] el reporte ${document.id} no tiene la forma esperada`);
          return [];
        });
        setState({ status: 'ready', reports });
      },
      (cause) => {
        reportError('[operator] falló el listener de la bandeja', cause);
        setState({ status: 'error', message: cause.message });
      },
    );
  }, []);

  return state;
}
