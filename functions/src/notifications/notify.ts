import { z } from 'zod';

import { alertPush, OPERATORS_TOPIC, statusPush } from './push-message';
import type { PushSender } from './push-sender';

/** Tope de tokens por usuario; el mismo que exigen las reglas de `users`. */
export const MAX_FCM_TOKENS = 5;

/** Acceso a los tokens del usuario (`users/{uid}.fcmTokens`). */
export interface TokenStore {
  /** Lo que haya en `fcmTokens`, sin validar: lo escribió el cliente. */
  readTokens(uid: string): Promise<unknown>;
  removeTokens(uid: string, tokens: string[]): Promise<void>;
}

type NotifyDeps = {
  /** `FCM_ENABLED`: en `false` no se envía nada (en local no hay credencial de FCM). */
  fcmEnabled: boolean;
  sender: PushSender;
  tokens: TokenStore;
};

export type NotifyResult = 'disabled' | 'not_notifiable' | 'no_tokens' | 'sent';

const reportSchema = z.object({ authorUid: z.string().min(1), status: z.string() });
const tokensSchema = z.array(z.string().min(1));

/**
 * RF08: avisa al autor cuando su reporte cambia de estado. El cambio ya está escrito: un fallo
 * del aviso no se reintenta ni deshace nada, solo se registra.
 *
 * @param before Documento del reporte antes del cambio (sin validar).
 * @param after Documento del reporte después del cambio (sin validar).
 */
export async function notifyStatusChange(
  reportId: string,
  before: unknown,
  after: unknown,
  deps: NotifyDeps,
): Promise<NotifyResult> {
  if (!deps.fcmEnabled) return 'disabled';
  const current = reportSchema.safeParse(after);
  if (!current.success) return 'not_notifiable';
  const previous = reportSchema.safeParse(before);
  const message = statusPush(
    reportId,
    previous.success ? previous.data.status : undefined,
    current.data.status,
  );
  if (!message) return 'not_notifiable';

  const { authorUid } = current.data;
  const stored = tokensSchema.safeParse(await deps.tokens.readTokens(authorUid));
  // Un usuario que no dio permiso de notificaciones no tiene tokens: no es un error.
  const tokens = stored.success ? stored.data.slice(0, MAX_FCM_TOKENS) : [];
  if (tokens.length === 0) return 'no_tokens';

  const { staleTokens } = await deps.sender.sendToTokens(tokens, message);
  if (staleTokens.length > 0) await deps.tokens.removeTokens(authorUid, staleTokens);
  return 'sent';
}

const alertSchema = z.object({ reportId: z.string().min(1), category: z.string().min(1) });

/**
 * RF03: avisa al tema de los operadores que hay una alerta nueva. Con la app abierta la alerta
 * ya llega por el listener de la bandeja; esto cubre la app cerrada (ADR 0006).
 *
 * @param alert Documento de `alerts` recién creado (sin validar).
 */
export async function notifyOperatorsOfAlert(
  alert: unknown,
  deps: Pick<NotifyDeps, 'fcmEnabled' | 'sender'>,
): Promise<NotifyResult> {
  if (!deps.fcmEnabled) return 'disabled';
  const parsed = alertSchema.safeParse(alert);
  if (!parsed.success) return 'not_notifiable';
  await deps.sender.sendToTopic(OPERATORS_TOPIC, alertPush(parsed.data));
  return 'sent';
}
