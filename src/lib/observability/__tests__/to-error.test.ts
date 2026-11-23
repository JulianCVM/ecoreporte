import { toError } from '../to-error';

describe('toError', () => {
  it('une el mensaje con el de la causa y conserva la causa', () => {
    const cause = new Error('permission-denied');
    const error = toError('[reports] el servidor rechazó el reporte r1', cause);
    expect(error.message).toBe('[reports] el servidor rechazó el reporte r1: permission-denied');
    expect(error.cause).toBe(cause);
  });

  it('acepta causas que no son un Error', () => {
    expect(toError('falló', { code: 7 }).message).toBe('falló: {"code":7}');
    expect(toError('falló', 'sin red').message).toBe('falló: "sin red"');
  });

  it('sin causa deja solo el mensaje', () => {
    expect(toError('queue.json no contiene una lista').message).toBe(
      'queue.json no contiene una lista',
    );
  });
});
