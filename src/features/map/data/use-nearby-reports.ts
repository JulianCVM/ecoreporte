import { useEffect, useState } from 'react';

import { distanceM, geohashRanges, type Coordinates } from '@/lib/geo/geohash';
import {
  collection,
  db,
  endAt,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAt,
  where,
} from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { MAP_CENTER_DECIMALS, MAP_RADIUS_M, MAP_REPORTS_PER_RANGE_LIMIT } from '../domain/limits';
import { MAP_STATUSES, parseMapReport, type MapReport } from '../domain/map-report';

export type NearbyReport = MapReport & { distanceM: number };

export type NearbyReportsState =
  | { status: 'loading' }
  | { status: 'ready'; reports: NearbyReport[] }
  | { status: 'error'; message: string };

const rounded = (value: number) => Number(value.toFixed(MAP_CENTER_DECIMALS));

/**
 * Reportes públicos a menos de `MAP_RADIUS_M` del centro, en vivo y del más cercano al más
 * lejano (RF05). Hace una consulta por cada rango de geohash; los rangos cubren de más, así que
 * al final se descarta por distancia real.
 *
 * La consulta filtra por estado público porque las reglas de Firestore rechazan una lista que
 * pudiera traer reportes en cuarentena (ADR 0004).
 */
export function useNearbyReports(center: Coordinates): NearbyReportsState {
  const [state, setState] = useState<NearbyReportsState>({ status: 'loading' });
  const latitude = rounded(center.latitude);
  const longitude = rounded(center.longitude);

  useEffect(() => {
    const origin = { latitude, longitude };
    const ranges = geohashRanges(origin, MAP_RADIUS_M);
    const byRange = new Map<number, MapReport[]>();

    const publish = () => {
      // Hasta que respondan todos los rangos el resultado está incompleto.
      if (byRange.size < ranges.length) return;
      const unique = new Map<string, NearbyReport>();
      for (const report of [...byRange.values()].flat()) {
        const distance = distanceM(origin, report);
        if (distance <= MAP_RADIUS_M) unique.set(report.id, { ...report, distanceM: distance });
      }
      const reports = [...unique.values()].sort((a, b) => a.distanceM - b.distanceM);
      setState({ status: 'ready', reports });
    };

    const stops = ranges.map(([start, end], index) =>
      onSnapshot(
        query(
          collection(db(), 'reports'),
          where('status', 'in', [...MAP_STATUSES]),
          orderBy('geohash'),
          startAt(start),
          endAt(end),
          limit(MAP_REPORTS_PER_RANGE_LIMIT),
        ),
        (snapshot) => {
          byRange.set(
            index,
            snapshot.docs.flatMap((document) => {
              const report = parseMapReport(document.id, document.data());
              return report ? [report] : [];
            }),
          );
          publish();
        },
        (cause) => {
          reportError('[map] falló la consulta de reportes cercanos', cause);
          setState({ status: 'error', message: cause.message });
        },
      ),
    );
    return () => stops.forEach((stop) => stop());
  }, [latitude, longitude]);

  return state;
}
