/**
 * Arma el `Error` que se registra en Crashlytics: el mensaje dice qué falló y la causa original
 * queda en `cause`. Lo que se lanza en JavaScript no siempre es un `Error`.
 */
export function toError(message: string, cause?: unknown): Error {
  if (cause === undefined) return new Error(message);
  const detail = cause instanceof Error ? cause.message : JSON.stringify(cause);
  return new Error(`${message}: ${detail}`, { cause });
}
