import AppTabs from '@/components/app-tabs';
import { useSession } from '@/features/auth/data/use-session';
import { useUploadQueueRunner } from '@/features/reports/data/use-upload-queue-runner';

export default function TabsLayout() {
  const session = useSession();
  // La cola de subida corre mientras hay sesión, en cualquier pestaña (RF01b, ADR 0004).
  useUploadQueueRunner(session.status === 'signed-in' ? session.user.uid : null);
  return <AppTabs />;
}
