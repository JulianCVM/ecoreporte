import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import {
  accuracyStatus,
  formatAccuracy,
  formatCoordinates,
  type LocationReading,
} from '../domain/report-location';

/** Coordenadas y precisión de la ubicación del reporte, con símbolo y texto (RNF06). */
export function LocationStatus({ reading }: { reading: LocationReading }) {
  const status = accuracyStatus(reading.accuracyM);
  const tooLow = status.level === 'too_low';
  const summary = `${status.label}, ${formatAccuracy(reading.accuracyM)}`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText
        type="smallBold"
        themeColor={tooLow ? 'danger' : 'text'}
        accessibilityLabel={`Ubicación: ${summary}`}
        accessibilityLiveRegion="polite">
        {status.symbol} {status.label} · {formatAccuracy(reading.accuracyM)}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {formatCoordinates(reading.latitude, reading.longitude)}
      </ThemedText>
      {status.hint ? <ThemedText type="small">{status.hint}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.one, padding: Spacing.three, borderRadius: Spacing.three },
});
