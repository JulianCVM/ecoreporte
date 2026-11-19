/**
 * Único punto de la app que importa React Native Firebase (AGENTS.md · capas).
 *
 * Usa la API modular del SDK nativo (ADR 0001). Las features obtienen las instancias de aquí
 * y nunca importan `@react-native-firebase/*` directamente. La conexión a los emuladores
 * se agrega en #3.
 */
import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';
import { getStorage } from '@react-native-firebase/storage';

/** Región de las Cloud Functions (ADR 0005; en local da igual, el emulador la respeta). */
export const FUNCTIONS_REGION = 'us-east1';

export const firebaseApp = () => getApp();
export const auth = () => getAuth(getApp());
export const db = () => getFirestore(getApp());
export const storage = () => getStorage(getApp());
export const functions = () => getFunctions(getApp(), FUNCTIONS_REGION);

/** ID del proyecto de Firebase al que apunta el build (lo muestra la pantalla Perfil). */
export const firebaseProjectId = (): string => getApp().options.projectId ?? 'desconocido';
