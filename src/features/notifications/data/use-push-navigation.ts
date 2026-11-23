import { useEffect, useRef } from 'react';

import { getInitialNotification, messaging, onNotificationOpenedApp } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { pushTarget, type PushTarget } from '../domain/push-target';

/**
 * Llama a `onOpen` cuando el usuario toca un aviso, tanto con la app en segundo plano como si
 * el aviso fue lo que la abrió.
 *
 * @param enabled `false` mientras no haya sesión: las pantallas de destino están protegidas.
 */
export function usePushNavigation(enabled: boolean, onOpen: (target: PushTarget) => void): void {
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    if (!enabled) return;
    const open = (data: unknown) => {
      const target = pushTarget(data);
      if (target) onOpenRef.current(target);
    };
    getInitialNotification(messaging())
      .then((message) => open(message?.data))
      .catch((cause: unknown) => {
        reportError('[push] no se pudo leer el aviso que abrió la app', cause);
      });
    return onNotificationOpenedApp(messaging(), (message) => open(message.data));
  }, [enabled]);
}
