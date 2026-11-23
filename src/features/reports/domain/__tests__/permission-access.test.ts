import { permissionAccess } from '../permission-access';

describe('permissionAccess', () => {
  it('mientras el sistema no responde, no se muestra ni el recurso ni un aviso', () => {
    expect(permissionAccess(null)).toBe('checking');
    expect(permissionAccess(undefined)).toBe('checking');
  });

  it('con el permiso concedido da acceso, aunque ya no se pueda volver a preguntar', () => {
    expect(permissionAccess({ granted: true, canAskAgain: false })).toBe('granted');
  });

  it('sin permiso y con diálogo disponible, lo pide', () => {
    expect(permissionAccess({ granted: false, canAskAgain: true })).toBe('ask');
  });

  it('negado de forma definitiva, manda a los ajustes en lugar de pedirlo en vano', () => {
    expect(permissionAccess({ granted: false, canAskAgain: false })).toBe('blocked');
  });
});
