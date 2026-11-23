import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { MapMarkerColors, Spacing } from '@/constants/theme';
import { appEnv } from '@/lib/config/env';
import type { Coordinates } from '@/lib/geo/geohash';

import { MAP_INITIAL_ZOOM } from '../domain/limits';
import type { MapReport } from '../domain/map-report';

const MAP_HEIGHT = 320; // Deja ver los filtros y la primera tarjeta sin desplazar la pantalla.
const MARKER_RADIUS = 9;
const SELECTED_MARKER_RADIUS = 14;

type Props = {
  center: Coordinates;
  reports: readonly MapReport[];
  selectedId: string | null;
  onSelect: (reportId: string) => void;
};

/**
 * Mapa con los reportes como puntos (RF05, ADR 0008). El color del punto distingue el estado,
 * pero no es la única señal: la lista de abajo dice el estado de cada reporte con texto.
 */
export function ReportsMap({ center, reports, selectedId, onSelect }: Props) {
  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: reports.map((report) => ({
      type: 'Feature',
      id: report.id,
      properties: { reportId: report.id, status: report.status },
      geometry: { type: 'Point', coordinates: [report.longitude, report.latitude] },
    })),
  };

  return (
    <View
      style={styles.frame}
      accessibilityLabel={`Mapa con ${reports.length} reportes. La lista de abajo tiene el detalle de cada uno.`}>
      <Map style={styles.map} mapStyle={appEnv.mapStyleUrl} touchRotate={false} touchPitch={false}>
        <Camera
          initialViewState={{
            center: [center.longitude, center.latitude],
            zoom: MAP_INITIAL_ZOOM,
          }}
        />
        <GeoJSONSource
          id="reports"
          data={data}
          onPress={(event) => {
            const reportId: unknown = event.nativeEvent.features[0]?.properties?.reportId;
            if (typeof reportId === 'string') onSelect(reportId);
          }}>
          <Layer
            id="report-points"
            type="circle"
            paint={{
              'circle-color': [
                'match',
                ['get', 'status'],
                'approved',
                MapMarkerColors.approved,
                'in_progress',
                MapMarkerColors.in_progress,
                MapMarkerColors.resolved,
              ],
              'circle-radius': [
                'case',
                ['==', ['get', 'reportId'], selectedId ?? ''],
                SELECTED_MARKER_RADIUS,
                MARKER_RADIUS,
              ],
              'circle-stroke-color': MapMarkerColors.stroke,
              'circle-stroke-width': 2,
            }}
          />
        </GeoJSONSource>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: MAP_HEIGHT, borderRadius: Spacing.three, overflow: 'hidden' },
  map: { flex: 1 },
});
