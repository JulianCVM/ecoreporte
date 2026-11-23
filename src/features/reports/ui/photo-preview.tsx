import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import type { EncodedPhoto } from '../domain/photo-compression';

const BYTES_PER_KB = 1024;

type Props = {
  photo: EncodedPhoto;
  /** Descarta la foto y vuelve a la cámara. */
  onRetake: () => void;
};

/** Vista previa de la foto ya comprimida, con su tamaño y la opción de repetirla. */
export function PhotoPreview({ photo, onRetake }: Props) {
  const sizeKb = Math.ceil(photo.bytes / BYTES_PER_KB);
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: photo.uri }}
        style={[styles.image, { aspectRatio: photo.widthPx / photo.heightPx }]}
        contentFit="cover"
        accessibilityRole="image"
        accessibilityLabel="Foto del reporte"
      />
      <ThemedText type="small" themeColor="textSecondary">
        ✓ Foto lista: {photo.widthPx} × {photo.heightPx} px · {sizeKb} KB
      </ThemedText>
      <PrimaryButton label="Repetir la foto" variant="secondary" onPress={onRetake} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  image: { width: '100%', borderRadius: Spacing.three },
});
