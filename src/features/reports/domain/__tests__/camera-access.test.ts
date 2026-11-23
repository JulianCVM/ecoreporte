import { cameraAccess } from '../camera-access';

describe('cameraAccess', () => {
  it('mientras el sistema no responde, no se muestra ni la cámara ni un aviso', () => {
    expect(cameraAccess(null)).toBe('checking');
    expect(cameraAccess(undefined)).toBe('checking');
  });

  it('con el permiso concedido abre la cámara, aunque ya no se pueda volver a preguntar', () => {
    expect(cameraAccess({ granted: true, canAskAgain: false })).toBe('granted');
  });

  it('sin permiso y con diálogo disponible, lo pide', () => {
    expect(cameraAccess({ granted: false, canAskAgain: true })).toBe('ask');
  });

  it('negado de forma definitiva, manda a los ajustes en lugar de pedirlo en vano', () => {
    expect(cameraAccess({ granted: false, canAskAgain: false })).toBe('blocked');
  });
});
