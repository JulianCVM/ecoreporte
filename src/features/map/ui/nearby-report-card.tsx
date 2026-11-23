import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { statusPresentation } from '@/features/reports/domain/my-report';

import type { NearbyReport } from '../data/use-nearby-reports';
import { formatDistance } from '../domain/map-report';
import { CATEGORY_NAMES, COMPLEXITY_NAMES } from './map-texts';

type Props = {
  report: NearbyReport;
  selected: boolean;
  /** Resalta el punto del reporte en el mapa. */
  onSelect: (reportId: string) => void;
};

/** Un reporte cercano: estado con símbolo y texto, distancia, tipo y complejidad. */
export function NearbyReportCard({ report, selected, onSelect }: Props) {
  const status = statusPresentation(report.status);
  return (
    <Card selected={selected}>
      <View style={styles.header}>
        <StatusBadge
          symbol={status.symbol}
          label={status.label}
          tone={status.tone}
          accessibilityLabel={`Estado: ${status.label}`}
        />
        <ThemedText type="small" themeColor="textSecondary">
          a {formatDistance(report.distanceM)}
        </ThemedText>
      </View>
      <ThemedText type="small">{report.summary}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {CATEGORY_NAMES[report.category]} · complejidad {COMPLEXITY_NAMES[report.complexity]}
      </ThemedText>
      {selected ? (
        <ThemedText type="small">● Es el punto resaltado en el mapa.</ThemedText>
      ) : (
        <PrimaryButton
          label="Ver en el mapa"
          variant="secondary"
          onPress={() => onSelect(report.id)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
