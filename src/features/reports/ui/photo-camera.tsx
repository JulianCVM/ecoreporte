import { CameraView } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type Props = {
  /** Recibe el archivo local de la foto recién tomada, sin comprimir. */
  onCapture: (uri: string) => void;
  /** Recibe el mensaje si la cámara no abre o la captura falla. */
  onError: (message: string) => void;
};

/** Vista de la cámara trasera con el botón de captura. Exige el permiso ya concedido. */
export function PhotoCamera({ onCapture, onError }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  async function takePhoto() {
    setCapturing(true);
    try {
      // La compresión la hace `compressPhoto` con los límites del dominio; aquí no se pierde
      // calidad dos veces. Sin EXIF: la ubicación del reporte no viaja dentro de la foto.
      const picture = await cameraRef.current?.takePictureAsync({ quality: 1, exif: false });
      if (!picture) throw new Error('la cámara no devolvió ninguna imagen');
      onCapture(picture.uri);
    } catch (cause) {
      onError(
        `No se pudo tomar la foto: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    } finally {
      setCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="picture"
        accessibilityLabel="Vista de la cámara"
        onCameraReady={() => setReady(true)}
        onMountError={({ message }) => onError(`No se pudo abrir la cámara: ${message}`)}
      />
      {/* Riesgo abierto de docs/02-arquitectura.md: fotos con personas o placas. */}
      <ThemedText type="small" themeColor="textSecondary">
        Enfoca los residuos. Evita que salgan personas o placas de vehículos.
      </ThemedText>
      <PrimaryButton label="Tomar la foto" loading={!ready || capturing} onPress={takePhoto} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  // 3:4 es la proporción del sensor en vertical: lo que se ve es lo que queda en la foto.
  camera: { width: '100%', aspectRatio: 3 / 4, borderRadius: Spacing.three, overflow: 'hidden' },
});
