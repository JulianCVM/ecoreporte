import { ScreenScaffold } from '@/components/screen-scaffold';
import { LocationStep } from '@/features/reports/ui/location-step';
import { PhotoStep } from '@/features/reports/ui/photo-step';

export default function ReportScreen() {
  return (
    <ScreenScaffold
      title="Reportar residuos"
      description="Toma una foto de los residuos en la vía pública. La ubicación se agrega sola."
      pending={[
        'RF01b · Guardar el reporte sin conexión y subir la foto al volver la señal',
        'RF02 · Veredicto de la IA en vivo',
      ]}>
      <LocationStep />
      <PhotoStep />
    </ScreenScaffold>
  );
}
