import { ScreenScaffold } from '@/components/screen-scaffold';
import { useSession } from '@/features/auth/data/use-session';
import { isStaff } from '@/features/auth/domain/role';
import { OperatorInbox } from '@/features/operator/ui/operator-inbox';

export default function OperatorScreen() {
  const session = useSession();
  // La pestaña se oculta al ciudadano, pero el permiso real son las reglas de Firestore.
  const staff = session.status === 'signed-in' && isStaff(session.user.role);

  return (
    <ScreenScaffold
      title="Bandeja"
      description="Reportes por revisar y reportes en atención, en vivo.">
      {staff ? <OperatorInbox /> : null}
    </ScreenScaffold>
  );
}
