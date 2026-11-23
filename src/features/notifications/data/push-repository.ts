import { PermissionsAndroid, Platform } from 'react-native';

import {
  AuthorizationStatus,
  db,
  doc,
  getDoc,
  getToken,
  messaging,
  requestPermission,
  setDoc,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '@/lib/firebase';

import { OPERATORS_TOPIC } from '../domain/limits';
import { storedTokens, withToken } from '../domain/push-tokens';

// Desde Android 13 (API 33) las notificaciones son un permiso que se pide en pantalla.
const ANDROID_API_WITH_NOTIFICATION_PERMISSION = 33;

/**
 * Pide el permiso de notificaciones si hace falta.
 *
 * @returns `false` si el usuario lo negó: la app sigue funcionando, sin avisos.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version < ANDROID_API_WITH_NOTIFICATION_PERMISSION) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(messaging());
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

/** Guarda un token en `users/{uid}.fcmTokens` si no estaba (RF08). */
export async function saveToken(uid: string, token: string): Promise<void> {
  const user = doc(db(), 'users', uid);
  const snapshot = await getDoc(user);
  const next = withToken(storedTokens(snapshot.data()?.fcmTokens), token);
  if (!next) return;
  // `merge`: una cuenta anterior al registro en `users` no tiene documento todavía.
  await setDoc(user, { fcmTokens: next }, { merge: true });
}

/**
 * Deja este dispositivo listo para recibir avisos del usuario: permiso, token guardado y, si es
 * operador, suscripción al tema de las alertas (RF03).
 *
 * @returns El token guardado, o `null` si el usuario negó el permiso.
 */
export async function registerDevice(uid: string, isOperator: boolean): Promise<string | null> {
  if (!(await requestPushPermission())) return null;
  const token = await getToken(messaging());
  await saveToken(uid, token);
  // El tema es del dispositivo, no de la cuenta: si quien entra no es operador, se quita.
  if (isOperator) await subscribeToTopic(messaging(), OPERATORS_TOPIC);
  else await unsubscribeFromTopic(messaging(), OPERATORS_TOPIC);
  return token;
}

/**
 * Antes de cerrar la sesión: este dispositivo deja de recibir los avisos de la cuenta. Hay que
 * llamarlo con la sesión todavía abierta, porque las reglas solo dejan editar el documento propio.
 */
export async function unregisterDevice(uid: string): Promise<void> {
  const token = await getToken(messaging());
  const user = doc(db(), 'users', uid);
  const snapshot = await getDoc(user);
  const stored = storedTokens(snapshot.data()?.fcmTokens);
  if (stored.includes(token)) {
    await setDoc(user, { fcmTokens: stored.filter((item) => item !== token) }, { merge: true });
  }
  await unsubscribeFromTopic(messaging(), OPERATORS_TOPIC);
}
