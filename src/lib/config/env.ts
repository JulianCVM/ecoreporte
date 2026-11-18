import { z } from 'zod';

/**
 * Configuración pública del cliente (docs/05-parametrizacion.md · Cliente).
 * Expo solo incrusta `process.env.EXPO_PUBLIC_*` cuando se escribe completo y literal,
 * por eso cada variable se lee por su nombre y no con un bucle.
 */
const envSchema = z.object({
  EXPO_PUBLIC_ENV: z.enum(['local', 'dev', 'prod']).default('local'),
  EXPO_PUBLIC_USE_EMULATORS: z.stringbool().default(false),
  EXPO_PUBLIC_EMULATOR_HOST: z.string().min(1).default('10.0.2.2'),
  EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN: z.string().optional(),
});

export type AppEnv = {
  env: 'local' | 'dev' | 'prod';
  useEmulators: boolean;
  emulatorHost: string;
  appCheckDebugToken?: string;
};

type RawEnv = Partial<Record<keyof z.input<typeof envSchema>, string | undefined>>;

/** Valida y normaliza; lanza un error legible si algo está mal puesto. */
export function parseEnv(raw: RawEnv): AppEnv {
  // Las variables vacías se tratan como ausentes para que apliquen los valores por defecto.
  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== undefined && value !== ''),
  );
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida (.env): ${detail}`);
  }
  const value = result.data;
  if (value.EXPO_PUBLIC_ENV === 'prod' && value.EXPO_PUBLIC_USE_EMULATORS) {
    throw new Error('Configuración inválida (.env): prod no puede usar emuladores');
  }
  return {
    env: value.EXPO_PUBLIC_ENV,
    useEmulators: value.EXPO_PUBLIC_USE_EMULATORS,
    emulatorHost: value.EXPO_PUBLIC_EMULATOR_HOST,
    appCheckDebugToken: value.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
  };
}

export const appEnv: AppEnv = parseEnv({
  EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
  EXPO_PUBLIC_USE_EMULATORS: process.env.EXPO_PUBLIC_USE_EMULATORS,
  EXPO_PUBLIC_EMULATOR_HOST: process.env.EXPO_PUBLIC_EMULATOR_HOST,
  EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
});
