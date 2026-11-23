import { crashlytics, recordError } from '@/lib/firebase';

import { toError } from './to-error';

/**
 * Registra un error no fatal: en la consola y en Crashlytics (RNF03, AGENTS.md · errores). El
 * mensaje dice qué falló y con qué dato; no lleva correos, nombres ni coordenadas.
 *
 * @param message Qué falló, con el prefijo de la feature: `[reports] …`.
 * @param cause Lo que se atrapó, si hubo excepción.
 */
export function reportError(message: string, cause?: unknown): void {
  if (cause === undefined) console.error(message);
  else console.error(message, cause);
  try {
    recordError(crashlytics(), toError(message, cause));
  } catch (failure) {
    // Registrar un error nunca debe tumbar lo que lo llamó.
    console.error('[observability] Crashlytics no aceptó el error', failure);
  }
}
