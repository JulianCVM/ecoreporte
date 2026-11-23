import { ScreenScaffold } from '@/components/screen-scaffold';
import { PhotoStep } from '@/features/reports/ui/photo-step';

export default function ReportScreen() {
  return (
    <ScreenScaffold
      title="Reportar residuos"
      description="Toma una foto de los residuos en la vía pública. La ubicación se agrega sola."
      pending={[
        'RF01 · Ubicación GPS con su precisión',
        'RF01b · Guardar el reporte sin conexión y subir la foto al volver la señal',
        'RF02 · Veredicto de la IA en vivo',
      ]}>
      <PhotoStep />
    </ScreenScaffold>
  );
}
