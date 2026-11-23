import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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
    <ThemedView type={selected ? 'backgroundSelected' : 'backgroundElement'} style={styles.card}>
      <ThemedText type="smallBold" accessibilityLabel={`Estado: ${status.label}`}>
        {status.symbol} {status.label} · a {formatDistance(report.distanceM)}
      </ThemedText>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
});
