import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { onUploadQueueChange, runUploadQueue } from './upload-queue';

/**
 * Mantiene viva la cola de subida mientras hay sesión (RF01b, ADR 0004). Hace una pasada:
 * al abrir la app, al volver a primer plano, al volver la red, al encolar una foto y cuando
 * vence la espera del próximo reintento.
 *
 * @param authorUid Usuario con sesión; `null` detiene la cola (las fotos se quedan guardadas).
 */
export function useUploadQueueRunner(authorUid: string | null): void {
  useEffect(() => {
    if (!authorUid) return;
    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      if (stopped) return;
      try {
        // Sin red no se gasta un intento: el aviso de red vuelve a llamar a `run`.
        const network = await getNetworkStateAsync();
        if (stopped || network.isConnected === false) return;
        const { nextAttemptAtMs } = await runUploadQueue(authorUid);
        if (stopped || nextAttemptAtMs == null) return;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(run, Math.max(0, nextAttemptAtMs - Date.now()));
      } catch (cause) {
        console.error('[upload-queue] falló la pasada por la cola', cause);
      }
    };

    void run();
    const network = addNetworkStateListener(({ isConnected }) => {
      if (isConnected) void run();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    const stopListening = onUploadQueueChange(() => void run());

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      network.remove();
      appState.remove();
      stopListening();
    };
  }, [authorUid]);
}
