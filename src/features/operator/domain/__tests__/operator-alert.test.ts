import {
  ACTIVE_ALERT_STATUSES,
  ALERT_STATUSES,
  nextAlertStep,
  parseAlert,
} from '../operator-alert';

const timestamp = (ms: number) => ({ toMillis: () => ms });
const document = (overrides: Record<string, unknown> = {}) => ({
  reportId: 'r1',
  status: 'open',
  category: 'escombros',
  complexity: 'alta',
  location: { latitude: 7.12, longitude: -73.12 },
  createdAt: timestamp(1_795_000_000_000),
  ...overrides,
});

describe('parseAlert', () => {
  it('lee la alerta con el tipo y las coordenadas', () => {
    expect(parseAlert('r1', document())).toEqual({
      id: 'r1',
      reportId: 'r1',
      status: 'open',
      category: 'escombros',
      complexity: 'alta',
      latitude: 7.12,
      longitude: -73.12,
      createdAtMs: 1_795_000_000_000,
    });
  });

  it('acepta una alerta cuya hora del servidor todavía no llegó', () => {
    expect(parseAlert('r1', document({ createdAt: null }))?.createdAtMs).toBeNull();
  });

  it('descarta una alerta sin ubicación o con un estado desconocido', () => {
    expect(parseAlert('r1', document({ location: null }))).toBeNull();
    expect(parseAlert('r1', document({ status: 'archivada' }))).toBeNull();
  });
});

describe('nextAlertStep', () => {
  it('una alerta solo avanza: abierta, atendida, cerrada', () => {
    expect(nextAlertStep('open')?.to).toBe('acknowledged');
    expect(nextAlertStep('acknowledged')?.to).toBe('closed');
    expect(nextAlertStep('closed')).toBeNull();
  });

  it('la bandeja trae justo las alertas a las que les falta un paso', () => {
    const pending = ALERT_STATUSES.filter((status) => nextAlertStep(status) !== null);
    expect([...ACTIVE_ALERT_STATUSES]).toEqual(pending);
  });
});
