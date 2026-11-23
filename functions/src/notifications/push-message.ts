/** Tema de FCM al que se suscriben los operadores (docs/04-infraestructura.md). */
export const OPERATORS_TOPIC = 'operators';

/** Un aviso listo para enviar. `data` le dice a la app qué abrir al tocarlo. */
export type PushMessage = {
  title: string;
  body: string;
  data: Record<string, string>;
};

// Estados que el autor quiere saber (RF08). Los intermedios (`pending_upload`, `processing_ai`)
// duran segundos y la app ya los muestra en vivo.
const STATUS_TEXTS: Record<string, { title: string; body: string }> = {
  approved: {
    title: 'Tu reporte fue aprobado',
    body: 'Ya aparece en el mapa y espera atención.',
  },
  needs_review: {
    title: 'Tu reporte está en revisión',
    body: 'Una persona lo va a revisar.',
  },
  rejected: {
    title: 'Tu reporte no fue aceptado',
    body: 'Abre el reporte para ver el motivo.',
  },
  in_progress: {
    title: 'Tu reporte está en atención',
    body: 'La entidad de aseo ya trabaja en él.',
  },
  resolved: {
    title: 'Tu reporte fue resuelto',
    body: 'Gracias por ayudar a mantener limpia la ciudad.',
  },
};

/**
 * RF08: el aviso para el autor cuando su reporte cambia de estado.
 *
 * @returns `null` si el estado no cambió o si el nuevo estado no se avisa.
 */
export function statusPush(
  reportId: string,
  before: string | undefined,
  after: string | undefined,
): PushMessage | null {
  if (!after || before === after) return null;
  const texts = STATUS_TEXTS[after];
  if (!texts) return null;
  return { ...texts, data: { type: 'report_status', reportId, status: after } };
}

/** RF03: el aviso al tema de los operadores cuando se crea una alerta. */
export function alertPush(alert: { reportId: string; category: string }): PushMessage {
  return {
    title: 'Alerta: residuos de complejidad alta',
    body: `Nuevo reporte de tipo ${alert.category}. Abre la bandeja para atenderlo.`,
    data: { type: 'operator_alert', reportId: alert.reportId },
  };
}
