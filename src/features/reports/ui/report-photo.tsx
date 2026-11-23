import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

import { useReportPhotoUri } from '../data/use-report-photo';
import type { MyReport } from '../domain/my-report';
import type { UploadEntry } from '../domain/upload-queue';

const THUMBNAIL_SIZE = 72; // Cabe junto a tres líneas de texto de la tarjeta.

type Props = {
  report: Pick<MyReport, 'status' | 'photoPath'>;
  /** Entrada del reporte en la cola de subida, si sigue ahí. */
  entry: UploadEntry | undefined;
  variant: 'thumbnail' | 'full';
};

/** La foto de un reporte; no pinta nada si no hay foto o todavía no se pudo leer. */
export function ReportPhoto({ report, entry, variant }: Props) {
  const uri = useReportPhotoUri(report, entry);
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      style={variant === 'thumbnail' ? styles.thumbnail : styles.full}
      // La miniatura recorta para llenar el cuadro; el detalle muestra la foto entera.
      contentFit={variant === 'thumbnail' ? 'cover' : 'contain'}
      accessibilityRole="image"
      accessibilityLabel="Foto del reporte"
    />
  );
}

const styles = StyleSheet.create({
  thumbnail: { width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, borderRadius: Spacing.two },
  full: { width: '100%', aspectRatio: 4 / 3, borderRadius: Spacing.three },
});
