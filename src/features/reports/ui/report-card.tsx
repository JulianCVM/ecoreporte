import { Alert, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { statusPresentation, type MyReport } from '../domain/my-report';
import { canTransition } from '../domain/report-status';
import { formatDate } from './format-date';

type Props = {
  report: MyReport;
  onCancel: (reportId: string) => void;
  /** Abre el detalle del reporte. */
  onOpen: (reportId: string) => void;
};

/** Un reporte en «Mis reportes»: estado con símbolo y texto, fecha, nota, detalle y cancelación. */
export function ReportCard({ report, onCancel, onOpen }: Props) {
  const status = statusPresentation(report.status);
  const date = formatDate(report.capturedAtMs);

  function confirmCancel() {
    Alert.alert('¿Cancelar este reporte?', 'La foto no se subirá. No se puede deshacer.', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: () => onCancel(report.id) },
    ]);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" accessibilityLabel={`Estado: ${status.label}. ${date}`}>
        {status.symbol} {status.label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {date}
      </ThemedText>
      <ThemedText type="small">{status.description}</ThemedText>
      {report.note ? <ThemedText type="small">«{report.note}»</ThemedText> : null}
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
});
