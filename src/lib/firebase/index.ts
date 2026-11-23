/**
 * Único punto de la app que importa React Native Firebase (AGENTS.md · capas).
 *
 * Usa la API modular del SDK nativo (ADR 0001). Las features obtienen las instancias de aquí
 * y nunca importan `@react-native-firebase/*` directamente. La primera vez que se pide una
 * instancia se conecta a la Emulator Suite si la configuración lo indica: Firestore exige que
 * eso pase antes de cualquier lectura o escritura.
 */
import { getApp } from '@react-native-firebase/app';
import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from '@react-native-firebase/functions';
import { connectStorageEmulator, getStorage } from '@react-native-firebase/storage';

import { appEnv } from '@/lib/config/env';

import { emulatorTargets } from './emulators';

/** Región de las Cloud Functions (ADR 0005; el emulador la respeta). */
export const FUNCTIONS_REGION = 'us-east1';

let initialized = false;

/** Conecta los servicios a los emuladores una sola vez. Es idempotente. */
function ensureInitialized(): void {
  if (initialized) return;
  initialized = true;
  const targets = emulatorTargets(appEnv);
  if (!targets) return;
  const app = getApp();
  connectAuthEmulator(getAuth(app), targets.authUrl);
  connectFirestoreEmulator(getFirestore(app), targets.host, targets.ports.firestore);
  connectStorageEmulator(getStorage(app), targets.host, targets.ports.storage);
  connectFunctionsEmulator(
    getFunctions(app, FUNCTIONS_REGION),
    targets.host,
    targets.ports.functions,
  );
}

export const firebaseApp = () => {
  ensureInitialized();
  return getApp();
};
export const auth = () => getAuth(firebaseApp());
export const db = () => getFirestore(firebaseApp());
export const storage = () => getStorage(firebaseApp());
export const functions = () => getFunctions(firebaseApp(), FUNCTIONS_REGION);

/** ID del proyecto de Firebase al que apunta el build (lo muestra la pantalla Perfil). */
export const firebaseProjectId = (): string => getApp().options.projectId ?? 'desconocido';

/** `true` si la app quedó conectada a la Emulator Suite. */
export const usingEmulators = (): boolean => emulatorTargets(appEnv) !== null;

// Funciones modulares que usan las capas `data/` de las features. Se re-exportan desde aquí para
// que este archivo siga siendo el único que importa el SDK; se agregan a medida que hacen falta.
export {
  createUserWithEmailAndPassword,
  getIdToken,
  getIdTokenResult,
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from '@react-native-firebase/auth';
export {
  arrayUnion,
  collection,
  doc,
  GeoPoint,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
export {
  getDownloadURL,
  getMetadata,
  putFile,
  ref,
  setMaxUploadRetryTime,
} from '@react-native-firebase/storage';
