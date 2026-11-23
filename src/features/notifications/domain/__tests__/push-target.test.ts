import { pushTarget } from '../push-target';

describe('pushTarget', () => {
  it('un aviso de cambio de estado abre el reporte', () => {
    expect(pushTarget({ type: 'report_status', reportId: 'r1', status: 'approved' })).toEqual({
      screen: 'report',
      reportId: 'r1',
    });
  });

  it('una alerta abre la bandeja del operador', () => {
    expect(pushTarget({ type: 'operator_alert', reportId: 'r1' })).toEqual({
      screen: 'operator-inbox',
    });
  });

  it('un aviso desconocido o sin reporte no lleva a ninguna pantalla', () => {
    expect(pushTarget(undefined)).toBeNull();
    expect(pushTarget({ type: 'promo' })).toBeNull();
    expect(pushTarget({ type: 'report_status' })).toBeNull();
  });
});
