import { analytics, logEvent } from '@/lib/firebase';

import { reportError } from './errors';

/**
 * Eventos de Analytics, con nombre y parámetros fijos (docs/05-parametrizacion.md · Eventos de
 * Analytics). Ninguno lleva datos personales: ni `uid`, ni coordenadas, ni texto del usuario.
 */
export type AnalyticsEvents = {
  report_started: undefined;
  report_created: { offline: boolean; accuracy_m: number };
  report_uploaded: { attempts: number; bytes: number; delay_s: number };
  report_verdict_seen: { status: string };
  report_status_changed: { from: string; to: string };
  map_opened: { radius_km: number };
};

type EventArgs<Name extends keyof AnalyticsEvents> = AnalyticsEvents[Name] extends undefined
  ? [name: Name]
  : [name: Name, params: AnalyticsEvents[Name]];

/** Registra un evento. Es un extra: si falla, se registra el error y la app sigue. */
export function trackEvent<Name extends keyof AnalyticsEvents>(...args: EventArgs<Name>): void {
  const [name, params] = args;
  try {
    logEvent(analytics(), name, params);
  } catch (cause) {
    reportError(`[analytics] no se pudo registrar el evento ${name}`, cause);
  }
}
