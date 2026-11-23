import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { changeReportStatus } from '../data/operator-repository';
import { useOperatorInbox } from '../data/use-operator-inbox';
import { InboxCard } from './inbox-card';

/** Bandeja del operador: reportes por revisar y reportes activos, en vivo (RF07). */
export function OperatorInbox() {
  const theme = useTheme();
  const state = useOperatorInbox();

  if (state.status === 'loading') {
    return <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando la bandeja" />;
  }
  if (state.status === 'error') {
    return <FormError message={`No se pudo cargar la bandeja: ${state.message}`} />;
  }
  if (state.reports.length === 0) {
    return <ThemedText themeColor="textSecondary">No hay reportes esperando atención.</ThemedText>;
  }
  return (
    <>
      {state.reports.map((report) => (
        <InboxCard key={report.id} report={report} onChangeStatus={changeReportStatus} />
      ))}
    </>
  );
}
