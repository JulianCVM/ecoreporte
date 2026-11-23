import { shouldAlert } from '../alert';

const of = (complexity: 'baja' | 'media' | 'alta') => ({ complexity });

describe('shouldAlert', () => {
  it('con ALERT_COMPLEXITY=alta solo alerta la complejidad alta', () => {
    expect(shouldAlert('approved', of('alta'), 'alta')).toBe(true);
    expect(shouldAlert('approved', of('media'), 'alta')).toBe(false);
    expect(shouldAlert('approved', of('baja'), 'alta')).toBe(false);
  });

  it('con ALERT_COMPLEXITY=media alerta desde media', () => {
    expect(shouldAlert('approved', of('media'), 'media')).toBe(true);
    expect(shouldAlert('approved', of('alta'), 'media')).toBe(true);
    expect(shouldAlert('approved', of('baja'), 'media')).toBe(false);
  });

  it('un reporte en revisión con complejidad alta también alerta', () => {
    expect(shouldAlert('needs_review', of('alta'), 'alta')).toBe(true);
  });

  it('un rechazado no alerta aunque la IA diga complejidad alta', () => {
    expect(shouldAlert('rejected', of('alta'), 'alta')).toBe(false);
  });

  it('sin clasificación (IA apagada, fallo o tope) no hay alerta', () => {
    expect(shouldAlert('needs_review', null, 'alta')).toBe(false);
  });
});
