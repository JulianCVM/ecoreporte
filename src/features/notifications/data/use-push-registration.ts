import { useEffect } from 'react';

import { messaging, onTokenRefresh } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { registerDevice, saveToken } from './push-repository';

/**
 * Registra el dispositivo para los avisos mientras haya sesión (RF08, RF03) y guarda el token
 * cuando FCM lo renueva. Los avisos son un extra: si algo falla se registra y la app sigue.
 *
 * @param uid Usuario con sesión, o `null` si no hay.
 * @param isOperator Si la cuenta es de operador: se suscribe al tema de las alertas.
 */
export function usePushRegistration(uid: string | null, isOperator: boolean): void {
  useEffect(() => {
    if (!uid) return;
    registerDevice(uid, isOperator).catch((cause: unknown) => {
      reportError('[push] no se pudo registrar el dispositivo para los avisos', cause);
    });
    return onTokenRefresh(messaging(), (token) => {
      saveToken(uid, token).catch((cause: unknown) => {
        reportError('[push] no se pudo guardar el token renovado', cause);
      });
    });
  }, [uid, isOperator]);
}
