import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { compressPhoto, deletePhotoFile } from '../data/photo-compressor';
import { cameraAccess } from '../domain/camera-access';
import { PhotoTooLargeError, type EncodedPhoto } from '../domain/photo-compression';
import { CameraPermissionNotice } from './camera-permission-notice';
import { PhotoCamera } from './photo-camera';
import { PhotoPreview } from './photo-preview';

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

  // El usuario puede conceder el permiso en los ajustes del sistema: al volver a la app hay
  // que consultarlo otra vez, o el aviso de «negado» se queda aunque ya esté activo.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      refreshPermission().catch((cause: unknown) => {
        setError(`No se pudo consultar el permiso de cámara: ${String(cause)}`);
      });
    });
    return () => subscription.remove();
  }, [refreshPermission]);

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

  const access = cameraAccess(permission);

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
        <CameraPermissionNotice
          access={access}
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
