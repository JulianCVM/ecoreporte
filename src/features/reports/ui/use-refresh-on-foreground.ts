import { useEffect } from 'react';
import { AppState } from 'react-native';

/**
 * Vuelve a consultar un permiso cada vez que la app regresa a primer plano.
 *
 * El usuario puede concederlo en los ajustes del sistema: sin esta consulta, el aviso de
 * «negado» se queda en pantalla aunque el permiso ya esté activo (error visto en #8).
 *
 * @param refresh Consulta el permiso (la tercera función de los hooks de permisos de Expo).
 * @param onError Recibe el mensaje si la consulta falla.
 */
export function useRefreshOnForeground(
  refresh: () => Promise<unknown>,
  onError: (message: string) => void,
) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refresh().catch((cause: unknown) => {
        onError(`No se pudo consultar el permiso: ${String(cause)}`);
      });
    });
    return () => subscription.remove();
  }, [refresh, onError]);
}
