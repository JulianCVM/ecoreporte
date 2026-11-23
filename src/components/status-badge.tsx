import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, toneColors, type Tone } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** Símbolo que acompaña al texto: el estado nunca se comunica solo con color (RNF06). */
  symbol: string;
  label: string;
  tone: Tone;
  /** Lo que lee el lector de pantalla; por defecto, la etiqueta. */
  accessibilityLabel?: string;
};

/** Estado de un reporte o de una alerta: píldora con símbolo, texto y color de apoyo. */
export function StatusBadge({ symbol, label, tone, accessibilityLabel }: Props) {
  const colors = toneColors(useTheme(), tone);
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <ThemedText
        type="smallBold"
        style={{ color: colors.text }}
        accessibilityLabel={accessibilityLabel ?? label}>
        {symbol} {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.one,
  },
});
