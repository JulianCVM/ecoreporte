import type { AppEnv } from '@/lib/config/env';

/**
 * Puertos de la Emulator Suite. Deben coincidir con `firebase.json`; una prueba lo comprueba.
 */
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
} as const;

export type EmulatorTargets = {
  authUrl: string;
  host: string;
  ports: typeof EMULATOR_PORTS;
};

/**
 * Decide si el cliente se conecta a los emuladores y a dónde (ADR 0007).
 *
 * Devuelve `null` si no se usan. `parseEnv` ya impide `prod` con emuladores; aquí se repite
 * la guarda para que un error de configuración nunca mande datos de producción al PC.
 * En el emulador de Android, el PC es `10.0.2.2`.
 */
export function emulatorTargets(
  env: Pick<AppEnv, 'env' | 'useEmulators' | 'emulatorHost'>,
): EmulatorTargets | null {
  if (!env.useEmulators || env.env === 'prod') return null;
  return {
    authUrl: `http://${env.emulatorHost}:${EMULATOR_PORTS.auth}`,
    host: env.emulatorHost,
    ports: EMULATOR_PORTS,
  };
}
