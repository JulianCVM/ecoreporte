import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { compressPhoto, deletePhotoFile } from '../data/photo-compressor';
import { permissionAccess } from '../domain/permission-access';
import { PhotoTooLargeError, type EncodedPhoto } from '../domain/photo-compression';
import { PermissionNotice, type PermissionNoticeTexts } from './permission-notice';
import { PhotoCamera } from './photo-camera';
import { PhotoPreview } from './photo-preview';
import { useRefreshOnForeground } from './use-refresh-on-foreground';

const CAMERA_NOTICE: PermissionNoticeTexts = {
  askTitle: 'EcoReporte necesita la cámara',
  askBody:
    'La foto del reporte se toma en el momento, desde la app. La cámara solo se usa mientras esta pantalla está abierta.',
  askLabel: 'Permitir la cámara',
  blockedTitle: 'El permiso de cámara está negado',
  blockedBody:
    'Para activarlo, abre los ajustes de la app, entra a «Permisos», toca «Cámara» y elige «Permitir solo mientras se usa la app». Después vuelve a esta pantalla.',
};

type Phase =
  { name: 'camera' } | { name: 'compressing' } | { name: 'preview'; photo: EncodedPhoto };

/** Borra un archivo temporal sin interrumpir el flujo: si falla, queda en el registro. */
function discardFile(uri: string) {
  try {
    deletePhotoFile(uri);
  } catch (cause) {
    console.warn(`No se pudo borrar la foto temporal ${uri}:`, cause);
  }
}

/**
 * Paso de la foto del reporte (RF01, issue #8): permiso, cámara, compresión y vista previa
 * con la opción de repetir.
 */
export function PhotoStep() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission, refreshPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ name: 'camera' });
  const [error, setError] = useState<string | null>(null);

  useRefreshOnForeground(refreshPermission, setError);

  async function handleCapture(rawUri: string) {
    setError(null);
    setPhase({ name: 'compressing' });
    try {
      const photo = await compressPhoto(rawUri);
      setPhase({ name: 'preview', photo });
    } catch (cause) {
      setError(
        cause instanceof PhotoTooLargeError
          ? 'La foto quedó demasiado pesada incluso comprimida. Toma otra con menos detalle.'
          : `No se pudo preparar la foto: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      setPhase({ name: 'camera' });
    } finally {
      discardFile(rawUri);
    }
  }

  function handleRetake(photo: EncodedPhoto) {
    discardFile(photo.uri);
    setError(null);
    setPhase({ name: 'camera' });
  }

  function handleRequestPermission() {
    requestPermission().catch((cause: unknown) => {
      setError(`No se pudo pedir el permiso de cámara: ${String(cause)}`);
    });
  }

  const access = permissionAccess(permission);

  return (
    <>
      <FormError message={error} />
      {phase.name === 'preview' ? (
        <PhotoPreview photo={phase.photo} onRetake={() => handleRetake(phase.photo)} />
      ) : phase.name === 'compressing' ? (
        <>
          <ActivityIndicator color={theme.primary} accessibilityLabel="Preparando la foto" />
          <ThemedText type="small" themeColor="textSecondary">
            Preparando la foto…
          </ThemedText>
        </>
      ) : access === 'ask' || access === 'blocked' ? (
        <PermissionNotice
          access={access}
          texts={CAMERA_NOTICE}
          onRequest={handleRequestPermission}
          onError={setError}
        />
      ) : access === 'granted' && isFocused ? (
        // Android no tiene la prop `active`: la cámara se desmonta al salir de la pestaña para
        // soltar el sensor y no gastar batería.
        <PhotoCamera onCapture={handleCapture} onError={setError} />
      ) : null}
    </>
  );
}
