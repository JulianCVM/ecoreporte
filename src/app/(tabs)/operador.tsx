import { useRouter } from 'expo-router';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/features/auth/data/use-session';
import { isStaff } from '@/features/auth/domain/role';
import { AlertList } from '@/features/operator/ui/alert-list';
import { OperatorInbox } from '@/features/operator/ui/operator-inbox';

export default function OperatorScreen() {
  const session = useSession();
  const router = useRouter();
  // La pestaña se oculta al ciudadano, pero el permiso real son las reglas de Firestore.
  const operatorUid =
    session.status === 'signed-in' && isStaff(session.user.role) ? session.user.uid : null;

  return (
    <ScreenScaffold
      title="Bandeja"
      description="Alertas, reportes por revisar y reportes en atención, en vivo.">
      {operatorUid ? (
        <>
          <ThemedText type="subtitle" accessibilityRole="header">
            Alertas
          </ThemedText>
          <AlertList
            operatorUid={operatorUid}
            onOpenReport={(id) => router.push({ pathname: '/reporte/[id]', params: { id } })}
          />
          <ThemedText type="subtitle" accessibilityRole="header">
            Reportes
          </ThemedText>
          <OperatorInbox />
        </>
      ) : null}
    </ScreenScaffold>
  );
}
