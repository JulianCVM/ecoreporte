import { useForegroundPermissions } from 'expo-location';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { useCurrentLocation } from '../data/use-current-location';
import { permissionAccess } from '../domain/permission-access';
import type { LocationReading } from '../domain/report-location';
import { LocationStatus } from './location-status';
import { PermissionNotice, type PermissionNoticeTexts } from './permission-notice';
import { useRefreshOnForeground } from './use-refresh-on-foreground';

const LOCATION_NOTICE: PermissionNoticeTexts = {
  askTitle: 'EcoReporte necesita tu ubicación',
  askBody:
    'Cada reporte lleva el punto donde están los residuos, para que la entidad de aseo llegue. La ubicación solo se lee mientras esta pantalla está abierta.',
  askLabel: 'Permitir la ubicación',
  blockedTitle: 'El permiso de ubicación está negado',
  blockedBody:
    'Para activarlo, abre los ajustes de la app, entra a «Permisos», toca «Ubicación», elige «Permitir solo mientras se usa la app» y deja activa la ubicación precisa. Después vuelve a esta pantalla.',
};

type Props = {
  /** Recibe la última lectura del GPS; `null` mientras no hay ninguna. */
  onReadingChange: (reading: LocationReading | null) => void;
};

/**
 * Paso de la ubicación del reporte (RF01, issue #9): permiso en primer plano y lectura del GPS
 * con su precisión. Cada lectura nueva se le entrega al formulario, que es quien la envía.
 */
export function LocationStep({ onReadingChange }: Props) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission, refreshPermission] = useForegroundPermissions();
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const access = permissionAccess(permission);
  const { reading, error } = useCurrentLocation(access === 'granted' && isFocused);

  useRefreshOnForeground(refreshPermission, setPermissionError);

  useEffect(() => {
    onReadingChange(reading);
  }, [reading, onReadingChange]);

  function handleRequestPermission() {
    requestPermission().catch((cause: unknown) => {
      setPermissionError(`No se pudo pedir el permiso de ubicación: ${String(cause)}`);
    });
  }

  return (
    <>
      <FormError message={permissionError ?? error} />
      {access === 'ask' || access === 'blocked' ? (
        <PermissionNotice
          access={access}
          texts={LOCATION_NOTICE}
          onRequest={handleRequestPermission}
          onError={setPermissionError}
        />
      ) : access === 'granted' && reading ? (
        <LocationStatus reading={reading} />
      ) : access === 'granted' && !error ? (
        <>
          <ActivityIndicator color={theme.primary} accessibilityLabel="Buscando tu ubicación" />
          <ThemedText type="small" themeColor="textSecondary">
            Buscando tu ubicación…
          </ThemedText>
        </>
      ) : null}
    </>
  );
}
