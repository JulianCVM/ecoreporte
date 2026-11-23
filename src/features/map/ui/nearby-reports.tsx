import { useForegroundPermissions } from 'expo-location';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useCurrentLocation } from '@/features/reports/data/use-current-location';
import { permissionAccess } from '@/features/reports/domain/permission-access';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/observability/analytics';

import { useNearbyReports } from '../data/use-nearby-reports';
import { MAP_FALLBACK_CENTER, MAP_RADIUS_M } from '../domain/limits';
import {
  applyFilters,
  formatDistance,
  METERS_PER_KM,
  NO_FILTERS,
  type MapFilters,
} from '../domain/map-report';
import { MapFiltersBar } from './map-filters';
import { NearbyReportCard } from './nearby-report-card';
import { ReportsMap } from './reports-map';

/**
 * Mapa y lista de los reportes públicos cercanos, con filtros (RF05). Usa la ubicación si el
 * permiso ya está dado en «Reportar»; si no, abre en el centro de la ciudad y lo dice.
 */
export function NearbyReports() {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission] = useForegroundPermissions();
  const hasLocation = permissionAccess(permission) === 'granted';
  const { reading } = useCurrentLocation(hasLocation && isFocused);
  const [filters, setFilters] = useState<MapFilters>(NO_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const waitingForLocation = hasLocation && !reading;
  const center = reading ?? MAP_FALLBACK_CENTER;
  const state = useNearbyReports(center);

  useEffect(() => {
    if (isFocused) trackEvent('map_opened', { radius_km: MAP_RADIUS_M / METERS_PER_KM });
  }, [isFocused]);

  if (waitingForLocation || state.status === 'loading') {
    return <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando el mapa" />;
  }
  if (state.status === 'error') {
    return <FormError message={`No se pudieron cargar los reportes: ${state.message}`} />;
  }

  const visible = applyFilters(state.reports, filters);
  return (
    <>
      {hasLocation ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          Sin permiso de ubicación: el mapa muestra el centro de Bucaramanga. Concede el permiso en
          la pestaña «Reportar» para ver lo que tienes cerca.
        </ThemedText>
      )}
      <ReportsMap
        center={center}
        reports={visible}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
      <MapFiltersBar filters={filters} onChange={setFilters} />
      <ThemedText type="smallBold" accessibilityRole="header" accessibilityLiveRegion="polite">
        {visible.length} de {state.reports.length} reportes a menos de{' '}
        {formatDistance(MAP_RADIUS_M)}
      </ThemedText>
      {visible.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          {state.reports.length === 0
            ? 'No hay reportes aprobados cerca.'
            : 'Ningún reporte cumple los filtros.'}
        </ThemedText>
      ) : null}
      {visible.map((report) => (
        <NearbyReportCard
          key={report.id}
          report={report}
          selected={report.id === selectedId}
          onSelect={setSelectedId}
        />
      ))}
    </>
  );
}
