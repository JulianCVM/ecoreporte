import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  onPress: () => void;
  /** Mientras es `true`, el botón muestra un indicador y no acepta otro toque. */
  loading?: boolean;
  /**
   * `secondary` va delineado: para acciones que no son la principal de la tarjeta. `danger`
   * también, con el color de error: para lo que no se puede deshacer (cancelar, rechazar).
   */
  variant?: 'primary' | 'secondary' | 'danger';
};

/** Botón de acción principal (o secundario) con estado de carga accesible. */
export function PrimaryButton({ label, onPress, loading = false, variant = 'primary' }: Props) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const outlineColor = variant === 'danger' ? theme.danger : theme.primary;
  const textColor = isPrimary ? theme.onPrimary : outlineColor;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: loading, disabled: loading }}
      disabled={loading}
      onPress={onPress}
      android_ripple={{ color: theme.backgroundSelected }}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: 'transparent', borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText type="smallBold" style={{ color: textColor }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, // Área táctil mínima de Material Design.
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    overflow: 'hidden', // El ripple de Android respeta las esquinas.
  },
  pressed: { opacity: 0.85 },
});
