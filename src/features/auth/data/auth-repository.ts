import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  getIdToken,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { authErrorCode, authErrorMessage, isKnownAuthError } from '../domain/auth-errors';
import type { SignInInput, SignUpInput } from '../domain/credentials';

/** Error con el mensaje listo para mostrar en español. */
export class AuthActionError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'AuthActionError';
  }
}

/**
 * Convierte un error del SDK en uno para la UI. Los que no están en la tabla se registran con su
 * código: son los que hay que investigar (Crashlytics llega con la issue #19).
 */
function toActionError(action: string, error: unknown): AuthActionError {
  if (!isKnownAuthError(error)) {
    reportError(`[auth] ${action} falló con un error no esperado`, error);
  }
  return new AuthActionError(authErrorMessage(error), authErrorCode(error));
}

/** Inicia sesión con correo y contraseña ya validados (`validateSignIn`). */
export async function signIn({ email, password }: SignInInput): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth(), email, password);
  } catch (error) {
    throw toActionError('signIn', error);
  }
}

/**
 * Crea la cuenta, le pone el nombre y crea `users/{uid}` (docs/03-modelo-de-datos.md).
 * El documento solo lleva `displayName` y `createdAt`: `reportsToday` es de la Function y las
 * reglas rechazan que el cliente lo escriba.
 */
export async function signUp({ displayName, email, password }: SignUpInput): Promise<void> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth(), email, password);
    await updateProfile(user, { displayName });
    // Token nuevo: así useSession recibe el usuario ya con su nombre.
    await getIdToken(user, true);
    await setDoc(doc(db(), 'users', user.uid), { displayName, createdAt: serverTimestamp() });
  } catch (error) {
    throw toActionError('signUp', error);
  }
}

/** Cierra la sesión; la guarda de rutas lleva al inicio de sesión. */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth());
  } catch (error) {
    throw toActionError('signOut', error);
  }
}
