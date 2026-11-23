import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const MARK_SIZE = 72;
const LEAF_SIZE = 36;

/**
 * Marca de la app para las pantallas de entrada: una hoja sobre el verde de acción. Se dibuja
 * con vistas para que siga el tema. Es decorativa: el nombre va en el título.
 */
export function BrandMark() {
  const theme = useTheme();
  return (
    <View
      style={[styles.mark, { backgroundColor: theme.primary }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.leaf, { backgroundColor: theme.onPrimary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Dos esquinas opuestas redondas y dos en punta: la silueta de una hoja.
  leaf: {
    width: LEAF_SIZE,
    height: LEAF_SIZE,
    borderTopLeftRadius: LEAF_SIZE,
    borderBottomRightRadius: LEAF_SIZE,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 4,
  },
});
