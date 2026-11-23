import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, toneColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Error general de un formulario o de un paso (credenciales, cámara…), anunciado al lector. */
export function FormError({ message }: { message: string | null }) {
  const colors = toneColors(useTheme(), 'danger');
  if (!message) return null;
  return (
    <View style={[styles.box, { backgroundColor: colors.background }]}>
      <ThemedText
        type="smallBold"
        style={{ color: colors.text }}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        ⚠ {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: Radius.control, padding: Spacing.three },
});
