import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

import { statusPresentation } from '../domain/my-report';
import { reviewReasonText, type TimelineStep } from '../domain/report-detail';
import { formatDate } from './format-date';

const ACTORS: Record<TimelineStep['by'], string> = {
  author: 'Tú',
  operator: 'Entidad de aseo',
  system: 'Análisis automático',
};

/** Historial de un reporte, del primer paso al último, con quién hizo cada cambio y cuándo. */
export function ReportTimeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <View style={styles.list}>
      {steps.map((step, index) => {
        const { symbol, label } = statusPresentation(step.status);
        const when = step.atMs == null ? 'Sin hora registrada' : formatDate(step.atMs);
        return (
          <View
            key={`${step.status}-${index}`}
            accessible
            accessibilityLabel={`${label}. ${when}. ${ACTORS[step.by]}`}>
            <ThemedText type="smallBold">
              {symbol} {label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {when} · {ACTORS[step.by]}
            </ThemedText>
            {step.reason ? (
              <ThemedText type="small">{reviewReasonText(step.reason)}</ThemedText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: Spacing.two },
});
