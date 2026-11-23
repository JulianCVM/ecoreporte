import { useRouter } from 'expo-router';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { useSession } from '@/features/auth/data/use-session';
import { MyReportsList } from '@/features/reports/ui/my-reports-list';

export default function MyReportsScreen() {
  const session = useSession();
  const router = useRouter();

  return (
    <ScreenScaffold
      title="Mis reportes"
      description="El estado de cada reporte se actualiza en vivo."
      pending={['RF06 · Miniatura de la foto', 'RF08 · Aviso push cuando cambia el estado']}>
      {session.status === 'signed-in' ? (
        <MyReportsList
          authorUid={session.user.uid}
          onOpenReport={(id) => router.push({ pathname: '/reporte/[id]', params: { id } })}
        />
      ) : null}
    </ScreenScaffold>
  );
}
