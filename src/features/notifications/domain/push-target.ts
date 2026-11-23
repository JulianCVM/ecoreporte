import { z } from 'zod';

/** A dónde lleva un aviso cuando el usuario lo toca. */
export type PushTarget = { screen: 'report'; reportId: string } | { screen: 'operator-inbox' };

// Los `data` que arma `functions/src/notifications/push-message.ts`.
const dataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('report_status'), reportId: z.string().min(1) }),
  z.object({ type: z.literal('operator_alert') }),
]);

/**
 * Lee los `data` de un aviso (RF08, RF03).
 *
 * @returns `null` si el aviso no es de los que la app sabe abrir; entonces solo abre la app.
 */
export function pushTarget(data: unknown): PushTarget | null {
  const parsed = dataSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data.type === 'report_status'
    ? { screen: 'report', reportId: parsed.data.reportId }
    : { screen: 'operator-inbox' };
}
