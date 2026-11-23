import { useEffect, useState } from 'react';

import { collection, db, limit, onSnapshot, orderBy, query, where } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { MY_REPORTS_LIMIT } from '../domain/limits';
import { parseMyReport, type MyReport } from '../domain/my-report';

export type MyReportsState =
  | { status: 'loading' }
  | { status: 'ready'; reports: MyReport[] }
  | { status: 'error'; message: string };

/**
 * Reportes del usuario, en vivo y del más reciente al más antiguo (RF06).
 *
 * El listener responde primero con lo que hay en el disco, así que funciona sin conexión y
 * muestra de inmediato un reporte recién creado (RNF01b).
 */
export function useMyReports(authorUid: string): MyReportsState {
  const [state, setState] = useState<MyReportsState>({ status: 'loading' });

  useEffect(() => {
    const mine = query(
      collection(db(), 'reports'),
      where('authorUid', '==', authorUid),
      orderBy('createdAt', 'desc'),
      limit(MY_REPORTS_LIMIT),
    );
    return onSnapshot(
      mine,
      (snapshot) => {
        const reports = snapshot.docs.flatMap((document) => {
          const report = parseMyReport(document.id, document.data());
          if (report) return [report];
          reportError(`[reports] el reporte ${document.id} no tiene la forma esperada`);
          return [];
        });
        setState({ status: 'ready', reports });
      },
      (cause) => {
        reportError('[reports] falló el listener de «Mis reportes»', cause);
        setState({ status: 'error', message: cause.message });
      },
    );
  }, [authorUid]);

  return state;
}
