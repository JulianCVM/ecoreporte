import { ScreenScaffold } from '@/components/screen-scaffold';
import { useSession } from '@/features/auth/data/use-session';
import { MyReportsList } from '@/features/reports/ui/my-reports-list';

export default function MyReportsScreen() {
  const session = useSession();

  return (
    <ScreenScaffold
      title="Mis reportes"
      description="El estado de cada reporte se actualiza en vivo."
      pending={[
        'RF06 · Detalle del reporte con su historial y miniatura',
        'RF08 · Aviso push cuando cambia el estado',
      ]}>
      {session.status === 'signed-in' ? <MyReportsList authorUid={session.user.uid} /> : null}
    </ScreenScaffold>
  );
}
