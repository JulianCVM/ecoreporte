import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { cancelReport } from '../data/report-repository';
import { useMyReports } from '../data/use-my-reports';
import { ReportCard } from './report-card';

type Props = {
  /** Usuario con sesión, dueño de los reportes. */
  authorUid: string;
};

/** Lista en vivo de los reportes del usuario, con sus estados vacío, de carga y de error (RF06). */
export function MyReportsList({ authorUid }: Props) {
  const theme = useTheme();
  const state = useMyReports(authorUid);

  if (state.status === 'loading') {
    return <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando tus reportes" />;
  }
  if (state.status === 'error') {
    return <FormError message={`No se pudieron cargar tus reportes: ${state.message}`} />;
  }
  if (state.reports.length === 0) {
    return (
      <ThemedText themeColor="textSecondary">
        Todavía no has hecho reportes. Crea el primero en la pestaña «Reportar».
      </ThemedText>
    );
  }
  return (
    <>
      {state.reports.map((report) => (
        <ReportCard key={report.id} report={report} onCancel={cancelReport} />
      ))}
    </>
  );
}
