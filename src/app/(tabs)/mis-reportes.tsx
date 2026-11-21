import { ScreenScaffold } from '@/components/screen-scaffold';

export default function MyReportsScreen() {
  return (
    <ScreenScaffold
      title="Mis reportes"
      description="El estado de cada reporte se actualiza en vivo."
      pending={['RF06 · Lista en vivo con estado', 'RF08 · Aviso push cuando cambia el estado']}
    />
  );
}
