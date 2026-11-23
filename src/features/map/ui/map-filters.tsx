import { StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/filter-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { statusPresentation } from '@/features/reports/domain/my-report';
import { COMPLEXITIES } from '@/features/reports/domain/types';

import { MAP_CATEGORIES, MAP_STATUSES, toggled, type MapFilters } from '../domain/map-report';
import { CATEGORY_NAMES, COMPLEXITY_NAMES } from './map-texts';

type Props = {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
};

/** Filtros del mapa por estado, tipo y complejidad (RF05). Sin nada marcado se ve todo. */
export function MapFiltersBar({ filters, onChange }: Props) {
  return (
    <View style={styles.groups}>
      <ThemedText type="smallBold">Estado</ThemedText>
      <View style={styles.row}>
        {MAP_STATUSES.map((status) => (
          <FilterChip
            key={status}
            label={statusPresentation(status).label}
            selected={filters.statuses.includes(status)}
            onPress={() => onChange({ ...filters, statuses: toggled(filters.statuses, status) })}
          />
        ))}
      </View>
      <ThemedText type="smallBold">Tipo</ThemedText>
      <View style={styles.row}>
        {MAP_CATEGORIES.map((category) => (
          <FilterChip
            key={category}
            label={CATEGORY_NAMES[category]}
            selected={filters.categories.includes(category)}
            onPress={() =>
              onChange({ ...filters, categories: toggled(filters.categories, category) })
            }
          />
        ))}
      </View>
      <ThemedText type="smallBold">Complejidad</ThemedText>
      <View style={styles.row}>
        {COMPLEXITIES.map((complexity) => (
          <FilterChip
            key={complexity}
            label={COMPLEXITY_NAMES[complexity]}
            selected={filters.complexities.includes(complexity)}
            onPress={() =>
              onChange({ ...filters, complexities: toggled(filters.complexities, complexity) })
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  groups: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
