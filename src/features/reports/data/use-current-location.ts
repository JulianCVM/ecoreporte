import { Accuracy, watchPositionAsync, type LocationSubscription } from 'expo-location';
import { useEffect, useState } from 'react';

import { LOCATION_UPDATE_INTERVAL_MS } from '../domain/limits';
import type { LocationReading } from '../domain/report-location';

type CurrentLocation = {
  /** Última lectura del GPS; `null` mientras llega la primera. */
  reading: LocationReading | null;
  /** Mensaje si el GPS falló o está apagado; `null` si todo va bien. */
  error: string | null;
};

/**
 * Sigue la ubicación en primer plano mientras `enabled` es `true` (RF01, issue #9).
 *
 * Usa lecturas continuas y no una sola porque el GPS afina con los segundos: la precisión que
 * ve el usuario mejora sola hasta que alcanza para enviar.
 *
 * @param enabled Permiso concedido y pantalla visible. En `false` se suelta el GPS.
 */
export function useCurrentLocation(enabled: boolean): CurrentLocation {
  const [reading, setReading] = useState<LocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let subscription: LocationSubscription | null = null;

    const describe = (cause: unknown) =>
      `No se pudo obtener la ubicación: ${cause instanceof Error ? cause.message : String(cause)}`;

    watchPositionAsync(
      { accuracy: Accuracy.High, timeInterval: LOCATION_UPDATE_INTERVAL_MS },
      ({ coords }) => {
        setError(null);
        setReading({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracyM: coords.accuracy,
        });
      },
      (reason) => setError(describe(reason)),
    )
      .then((started) => {
        // Si la pantalla se cerró mientras arrancaba el GPS, se suelta de inmediato.
        if (cancelled) started.remove();
        else subscription = started;
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describe(cause));
      });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return { reading, error };
}
