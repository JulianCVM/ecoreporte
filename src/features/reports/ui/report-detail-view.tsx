import { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';

import { Card } from '@/components/card';
import { FormError } from '@/components/form-error';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { trackEvent } from '@/lib/observability/analytics';

import { useReport } from '../data/use-report';
import { useUploadEntries } from '../data/use-upload-entries';
import { statusPresentation } from '../domain/my-report';
import { categoryLabel, complexityLabel } from '../domain/report-detail';
import { hasVerdict } from '../domain/report-status';
import { formatCoordinates } from '../domain/report-location';
import { formatDate } from './format-date';
import { ReportPhoto } from './report-photo';
import { ReportTimeline } from './report-timeline';

/** Detalle de un reporte en vivo: estado, lo que dijo la IA, ubicación e historial (RF06). */
export function ReportDetailView({ reportId }: { reportId: string }) {
  const theme = useTheme();
  const state = useReport(reportId);
  const uploads = useUploadEntries();

  // Un evento por cada estado con veredicto que el usuario ve en esta pantalla.
  const seenStatus = state.status === 'ready' ? state.report.status : null;
  useEffect(() => {
    if (seenStatus && hasVerdict(seenStatus)) {
      trackEvent('report_verdict_seen', { status: seenStatus });
    }
  }, [seenStatus]);

  if (state.status === 'loading') {
    return <ActivityIndicator color={theme.primary} accessibilityLabel="Cargando el reporte" />;
  }
  if (state.status === 'error') {
    return <FormError message={`No se pudo cargar el reporte: ${state.message}`} />;
  }
  if (state.status === 'missing') {
    return <FormError message="Este reporte ya no existe o no se puede leer." />;
  }

  const { report } = state;
  const status = statusPresentation(report.status);
  return (
    <>
      <ReportPhoto
        report={report}
        entry={uploads.find((entry) => entry.reportId === report.id)}
        variant="full"
      />
      <Card>
        <StatusBadge
          symbol={status.symbol}
          label={status.label}
          tone={status.tone}
          accessibilityLabel={`Estado: ${status.label}`}
        />
        <ThemedText type="small">{status.description}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Tomado el {formatDate(report.capturedAtMs)}
        </ThemedText>
        {report.latitude != null && report.longitude != null ? (
          <ThemedText type="small" themeColor="textSecondary">
            Ubicación: {formatCoordinates(report.latitude, report.longitude)}
          </ThemedText>
        ) : null}
        {report.note ? <ThemedText type="small">«{report.note}»</ThemedText> : null}
      </Card>

      {report.ai ? (
        <Card>
          <ThemedText type="smallBold" accessibilityRole="header">
            Análisis automático
          </ThemedText>
          <ThemedText type="small">{report.ai.summary}</ThemedText>
          <ThemedText type="small">Tipo: {categoryLabel(report.ai.category)}</ThemedText>
          <ThemedText type="small">Complejidad: {complexityLabel(report.ai.complexity)}</ThemedText>
        </Card>
      ) : null}

      <Card>
        <ThemedText type="smallBold" accessibilityRole="header">
          Historial
        </ThemedText>
        <ReportTimeline steps={report.timeline} />
      </Card>
    </>
  );
}
