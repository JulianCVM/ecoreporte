import { useLocalSearchParams } from 'expo-router';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ReportDetailView } from '@/features/reports/ui/report-detail-view';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ScreenScaffold
      title="Reporte"
      description="Se actualiza en vivo cuando cambia de estado."
      hasHeader>
      <ReportDetailView reportId={id} />
    </ScreenScaffold>
  );
}
