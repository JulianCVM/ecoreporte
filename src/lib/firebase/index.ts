/**
 * Único punto de la app que importa React Native Firebase (AGENTS.md · capas).
 *
 * Usa la API modular del SDK nativo (ADR 0001). Las features obtienen las instancias de aquí
 * y nunca importan `@react-native-firebase/*` directamente. La primera vez que se pide una
 * instancia se conecta a la Emulator Suite si la configuración lo indica: Firestore exige que
 * eso pase antes de cualquier lectura o escritura.
 */
import { getAnalytics } from '@react-native-firebase/analytics';
import { getApp } from '@react-native-firebase/app';
import { connectAuthEmulator, getAuth } from '@react-native-firebase/auth';
import { getCrashlytics, setAttribute } from '@react-native-firebase/crashlytics';
import { connectFirestoreEmulator, getFirestore } from '@react-native-firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from '@react-native-firebase/functions';
import { getMessaging } from '@react-native-firebase/messaging';
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
  const app = getApp();
  // Así los errores de Crashlytics se pueden filtrar por entorno (docs/05 · EXPO_PUBLIC_ENV).
  setAttribute(getCrashlytics(app), 'env', appEnv.env).catch((cause: unknown) => {
    console.error('[firebase] no se pudo etiquetar el entorno en Crashlytics', cause);
  });
  const targets = emulatorTargets(appEnv);
  if (!targets) return;
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
/** Crashlytics y Analytics no tienen emulador: van al proyecto de `google-services.json`. */
export const crashlytics = () => getCrashlytics(firebaseApp());
export const analytics = () => getAnalytics(firebaseApp());
/** FCM no tiene emulador: siempre habla con el proyecto de `google-services.json`. */
export const messaging = () => getMessaging(firebaseApp());

/** ID del proyecto de Firebase al que apunta el build (lo muestra la pantalla Perfil). */
export const firebaseProjectId = (): string => getApp().options.projectId ?? 'desconocido';

/** `true` si la app quedó conectada a la Emulator Suite. */
export const usingEmulators = (): boolean => emulatorTargets(appEnv) !== null;

// Funciones modulares que usan las capas `data/` de las features. Se re-exportan desde aquí para
// que este archivo siga siendo el único que importa el SDK; se agregan a medida que hacen falta.
export { logEvent } from '@react-native-firebase/analytics';
export { recordError } from '@react-native-firebase/crashlytics';
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
  endAt,
  GeoPoint,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
  Timestamp,
  updateDoc,
  where,
} from '@react-native-firebase/firestore';
export {
  AuthorizationStatus,
  getInitialNotification,
  getToken,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@react-native-firebase/messaging';
export {
  getDownloadURL,
  getMetadata,
  putFile,
  ref,
  setMaxUploadRetryTime,
} from '@react-native-firebase/storage';
