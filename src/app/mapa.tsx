import { ScreenScaffold } from '@/components/screen-scaffold';

export default function MapaScreen() {
  return (
    <ScreenScaffold
      title="Mapa"
      description="Reportes aprobados cerca de ti."
      pending={['RF05 · Mapa por cercanía (geohash) con filtros por estado, tipo y complejidad']}
    />
  );
}
