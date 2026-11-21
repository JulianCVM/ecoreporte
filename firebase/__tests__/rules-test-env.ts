import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

/** Proyecto `demo-`: el emulador nunca toca la nube (docs/04-infraestructura.md). */
export const PROJECT_ID = 'demo-ecoreporte';

/** Usuarios de prueba (sin datos personales reales). */
export const UIDS = { author: 'ana', other: 'beto', operator: 'olga' } as const;

/** ID con la forma de `doc().id` (20 caracteres alfanuméricos), como exige storage.rules. */
export const REPORT_ID = 'Ab3dE5gH7jK9mN1pQ3sT';

/**
 * Entorno de reglas contra los emuladores que levanta `npm run test:rules`. Las reglas se leen
 * del repositorio en cada corrida: una prueba nunca valida una copia vieja.
 */
export function createRulesEnv(): Promise<RulesTestEnvironment> {
  const rules = (file: string) => readFileSync(path.join(__dirname, '..', file), 'utf8');
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: rules('firestore.rules') },
    storage: { rules: rules('storage.rules') },
  });
}

/** Contextos de cada actor: el rol va en los custom claims del token, nunca en un documento. */
export function actors(
  env: RulesTestEnvironment,
): Record<'author' | 'other' | 'operator' | 'anonymous', RulesTestContext> {
  return {
    author: env.authenticatedContext(UIDS.author),
    other: env.authenticatedContext(UIDS.other),
    operator: env.authenticatedContext(UIDS.operator, { role: 'operator' }),
    anonymous: env.unauthenticatedContext(),
  };
}
