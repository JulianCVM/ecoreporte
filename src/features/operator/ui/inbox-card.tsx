import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { statusPresentation } from '@/features/reports/domain/my-report';
import {
  categoryLabel,
  complexityLabel,
  reviewReasonText,
  type ReportDetail,
} from '@/features/reports/domain/report-detail';
import { formatCoordinates } from '@/features/reports/domain/report-location';
import type { ReportStatus } from '@/features/reports/domain/types';
import { formatDate } from '@/features/reports/ui/format-date';
import { ReportPhoto } from '@/features/reports/ui/report-photo';
import { reportError } from '@/lib/observability/errors';

import { operatorActions, type OperatorAction } from '../domain/operator-actions';

type Props = {
  report: ReportDetail;
  /** Aplica el cambio de estado; la promesa falla si el servidor lo rechaza. */
  onChangeStatus: (reportId: string, from: ReportStatus, to: ReportStatus) => Promise<void>;
};

/** Un reporte en la bandeja del operador, con lo que dijo la IA y las acciones posibles. */
export function InboxCard({ report, onChangeStatus }: Props) {
  const [busy, setBusy] = useState<ReportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const status = statusPresentation(report.status);
  const reason = report.timeline.at(-1)?.reason;

  async function apply(action: OperatorAction) {
    setBusy(action.to);
    setError(null);
    try {
      await onChangeStatus(report.id, report.status, action.to);
    } catch (cause) {
      reportError(`[operator] no se pudo cambiar el estado de ${report.id}`, cause);
      setError(`No se pudo cambiar el estado: ${cause instanceof Error ? cause.message : cause}`);
    } finally {
      setBusy(null);
    }
  }

  function confirm(action: OperatorAction) {
    Alert.alert(action.label, action.confirmation, [
      { text: 'No', style: 'cancel' },
      { text: `Sí, ${action.label.toLowerCase()}`, onPress: () => void apply(action) },
    ]);
  }

  return (
    <Card>
      <View style={styles.summary}>
        <ReportPhoto report={report} entry={undefined} variant="thumbnail" />
        <View style={styles.texts}>
          <StatusBadge
            symbol={status.symbol}
            label={status.label}
            tone={status.tone}
            accessibilityLabel={`Estado: ${status.label}`}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {formatDate(report.capturedAtMs)}
          </ThemedText>
          {report.latitude != null && report.longitude != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              {formatCoordinates(report.latitude, report.longitude)}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {report.ai ? (
        <>
          <ThemedText type="small">{report.ai.summary}</ThemedText>
          <ThemedText type="small">Tipo: {categoryLabel(report.ai.category)}</ThemedText>
          <ThemedText type="small">Complejidad: {complexityLabel(report.ai.complexity)}</ThemedText>
        </>
      ) : (
        <ThemedText type="small">Sin análisis automático: revisa la foto.</ThemedText>
      )}
      {reason ? <ThemedText type="small">{reviewReasonText(reason)}</ThemedText> : null}
      {report.note ? <ThemedText type="small">«{report.note}»</ThemedText> : null}
      <FormError message={error} />
      {operatorActions(report.status).map((action) => (
        <PrimaryButton
          key={action.to}
          label={action.label}
          variant={action.to === 'rejected' ? 'danger' : 'primary'}
          loading={busy === action.to}
          onPress={() => confirm(action)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: Spacing.three },
  texts: { flex: 1, gap: Spacing.one },
});
