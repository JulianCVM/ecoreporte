import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { categoryLabel, complexityLabel } from '@/features/reports/domain/report-detail';
import { formatCoordinates } from '@/features/reports/domain/report-location';
import { formatDate } from '@/features/reports/ui/format-date';
import { reportError } from '@/lib/observability/errors';

import {
  alertStatusText,
  nextAlertStep,
  type AlertStatus,
  type OperatorAlert,
} from '../domain/operator-alert';

type Props = {
  alert: OperatorAlert;
  /** Avanza la alerta; la promesa falla si el servidor lo rechaza. */
  onAdvance: (alertId: string, from: AlertStatus) => Promise<void>;
  /** Abre el reporte que originó la alerta. */
  onOpenReport: (reportId: string) => void;
};

/** Una alerta por complejidad alta: tipo, coordenadas, hora y el paso siguiente (RF03). */
export function AlertCard({ alert, onAdvance, onOpenReport }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = alertStatusText(alert.status);
  const step = nextAlertStep(alert.status);

  async function advance() {
    setBusy(true);
    setError(null);
    try {
      await onAdvance(alert.id, alert.status);
    } catch (cause) {
      reportError(`[operator] no se pudo avanzar la alerta ${alert.id}`, cause);
      setError(`No se pudo cambiar la alerta: ${cause instanceof Error ? cause.message : cause}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold" accessibilityLabel={`${status.label}`}>
        {status.symbol} {status.label}
      </ThemedText>
      <ThemedText type="small">{categoryLabel(alert.category)}</ThemedText>
      <ThemedText type="small">Complejidad: {complexityLabel(alert.complexity)}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatCoordinates(alert.latitude, alert.longitude)}
        {alert.createdAtMs == null ? '' : ` · ${formatDate(alert.createdAtMs)}`}
      </ThemedText>
      <FormError message={error} />
      {step ? (
        <PrimaryButton label={step.label} loading={busy} onPress={() => void advance()} />
      ) : null}
      <PrimaryButton
        label="Ver el reporte"
        variant="secondary"
        onPress={() => onOpenReport(alert.reportId)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
});
