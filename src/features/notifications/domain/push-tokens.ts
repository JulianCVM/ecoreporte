import { z } from 'zod';

import { MAX_FCM_TOKENS } from './limits';

const tokensSchema = z.array(z.string().min(1));

/** Los tokens guardados en `users/{uid}.fcmTokens`; una lista vacía si el campo falta o está mal. */
export function storedTokens(value: unknown): string[] {
  const parsed = tokensSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/**
 * La lista de tokens con el de este dispositivo al final. Si ya no cabe, salen los más viejos:
 * son los de dispositivos que llevan más tiempo sin abrir la app.
 *
 * @returns `null` si el token ya estaba y no hay nada que guardar.
 */
export function withToken(stored: readonly string[], token: string): string[] | null {
  if (stored.includes(token)) return null;
  return [...stored, token].slice(-MAX_FCM_TOKENS);
}
