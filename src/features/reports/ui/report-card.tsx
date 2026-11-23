import { Alert, StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { statusPresentation, type MyReport } from '../domain/my-report';
import { canTransition } from '../domain/report-status';
import type { UploadEntry } from '../domain/upload-queue';
import { formatDate } from './format-date';
import { ReportPhoto } from './report-photo';

type Props = {
  report: MyReport;
  /** Entrada del reporte en la cola de subida, si sigue ahí. */
  uploadEntry: UploadEntry | undefined;
  onCancel: (reportId: string) => void;
  /** Abre el detalle del reporte. */
  onOpen: (reportId: string) => void;
  /** Vuelve a intentar la subida de una foto que quedó fallida. */
  onRetryUpload: (reportId: string) => void;
};

/** Un reporte en «Mis reportes»: estado con símbolo y texto, fecha, nota, detalle y cancelación. */
export function ReportCard({ report, uploadEntry, onCancel, onOpen, onRetryUpload }: Props) {
  const status = statusPresentation(report.status);
  const date = formatDate(report.capturedAtMs);
  const uploadFailed = report.status === 'pending_upload' && uploadEntry?.state === 'failed';

  function confirmCancel() {
    Alert.alert('¿Cancelar este reporte?', 'La foto no se subirá. No se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancel(report.id) },
    ]);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.summary}>
        <ReportPhoto report={report} entry={uploadEntry} variant="thumbnail" />
        <View style={styles.texts}>
          <ThemedText type="smallBold" accessibilityLabel={`Estado: ${status.label}. ${date}`}>
            {status.symbol} {status.label}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {date}
          </ThemedText>
          {/* Con la subida fallida, «sube sola» ya no es cierto: lo explica el aviso de abajo. */}
          {uploadFailed ? null : <ThemedText type="small">{status.description}</ThemedText>}
        </View>
      </View>
      {report.note ? <ThemedText type="small">«{report.note}»</ThemedText> : null}
      {uploadFailed ? (
        <>
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            ✕ La foto no se pudo subir después de varios intentos.
          </ThemedText>
          <PrimaryButton label="Reintentar la subida" onPress={() => onRetryUpload(report.id)} />
        </>
      ) : null}
      <PrimaryButton
        label="Ver detalle e historial"
        variant="secondary"
        onPress={() => onOpen(report.id)}
      />
      {canTransition('author', report.status, 'cancelled') ? (
        <PrimaryButton label="Cancelar el reporte" variant="secondary" onPress={confirmCancel} />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
  summary: { flexDirection: 'row', gap: Spacing.three },
  texts: { flex: 1, gap: Spacing.one },
});
