import { ScreenScaffold } from '@/components/screen-scaffold';
import { NearbyReports } from '@/features/map/ui/nearby-reports';

export default function MapScreen() {
  return (
    <ScreenScaffold title="Mapa" description="Reportes aprobados cerca de ti, en vivo.">
      <NearbyReports />
    </ScreenScaffold>
  );
}
