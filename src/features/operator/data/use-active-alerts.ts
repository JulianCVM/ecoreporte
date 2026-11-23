import { useEffect, useState } from 'react';

import { collection, db, limit, onSnapshot, orderBy, query, where } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { OPERATOR_ALERTS_LIMIT } from '../domain/limits';
import { ACTIVE_ALERT_STATUSES, parseAlert, type OperatorAlert } from '../domain/operator-alert';

export type ActiveAlertsState =
  | { status: 'loading' }
  | { status: 'ready'; alerts: OperatorAlert[] }
  | { status: 'error'; message: string };

/**
 * Alertas abiertas o atendidas, en vivo y de la más reciente a la más antigua (RF03). Con la
 * app abierta, este listener es el canal de las alertas (ADR 0006).
 */
export function useActiveAlerts(): ActiveAlertsState {
  const [state, setState] = useState<ActiveAlertsState>({ status: 'loading' });

  useEffect(() => {
    const active = query(
      collection(db(), 'alerts'),
      where('status', 'in', [...ACTIVE_ALERT_STATUSES]),
      orderBy('createdAt', 'desc'),
      limit(OPERATOR_ALERTS_LIMIT),
    );
    return onSnapshot(
      active,
      (snapshot) => {
        const alerts = snapshot.docs.flatMap((document) => {
          const alert = parseAlert(document.id, document.data());
          if (alert) return [alert];
          reportError(`[operator] la alerta ${document.id} no tiene la forma esperada`);
          return [];
        });
        setState({ status: 'ready', alerts });
      },
      (cause) => {
        reportError('[operator] falló el listener de las alertas', cause);
        setState({ status: 'error', message: cause.message });
      },
    );
  }, []);

  return state;
}
