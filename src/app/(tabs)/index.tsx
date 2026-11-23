import { ScreenScaffold } from '@/components/screen-scaffold';
import { useSession } from '@/features/auth/data/use-session';
import { ReportForm } from '@/features/reports/ui/report-form';

export default function ReportScreen() {
  const session = useSession();

  return (
    <ScreenScaffold
      title="Reportar residuos"
      description="Toma una foto de los residuos en la vía pública. La ubicación se agrega sola."
      pending={['RF02 · Veredicto de la IA en vivo']}>
      {session.status === 'signed-in' ? <ReportForm authorUid={session.user.uid} /> : null}
    </ScreenScaffold>
  );
}
