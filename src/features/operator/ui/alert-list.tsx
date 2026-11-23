import { ActivityIndicator } from 'react-native';

import { FormError } from '@/components/form-error';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

import { advanceAlert } from '../data/operator-repository';
import { useActiveAlerts } from '../data/use-active-alerts';
import { AlertCard } from './alert-card';

type Props = {
  /** Operador con sesión: queda como quien atendió la alerta. */
  operatorUid: string;
  onOpenReport: (reportId: string) => void;
};

/** Alertas por complejidad alta que siguen abiertas o atendidas, en vivo (RF03). */
export function AlertList({ operatorUid, onOpenReport }: Props) {
  const theme = useTheme();
  const state = useActiveAlerts();

  if (state.status === 'loading') {
    return <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando las alertas" />;
  }
  if (state.status === 'error') {
    return <FormError message={`No se pudieron cargar las alertas: ${state.message}`} />;
  }
  if (state.alerts.length === 0) {
    return <ThemedText themeColor="textSecondary">No hay alertas abiertas.</ThemedText>;
  }
  return (
    <>
      {state.alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onAdvance={(alertId, from) => advanceAlert(alertId, from, operatorUid)}
          onOpenReport={onOpenReport}
        />
      ))}
    </>
  );
}
