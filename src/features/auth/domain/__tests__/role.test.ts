import { isStaff, roleFromClaims } from '../role';

describe('roleFromClaims', () => {
  it('lee el rol del claim', () => {
    expect(roleFromClaims({ role: 'operator' })).toBe('operator');
    expect(roleFromClaims({ role: 'admin' })).toBe('admin');
  });

  it('sin claim o con un valor desconocido, es ciudadano', () => {
    expect(roleFromClaims({})).toBe('citizen');
    expect(roleFromClaims(undefined)).toBe('citizen');
    expect(roleFromClaims({ role: 'superusuario' })).toBe('citizen');
    expect(roleFromClaims({ role: ['operator'] })).toBe('citizen');
  });
});

describe('isStaff', () => {
  it('el operador y el administrador atienden reportes; el ciudadano no', () => {
    expect(isStaff('operator')).toBe(true);
    expect(isStaff('admin')).toBe(true);
    expect(isStaff('citizen')).toBe(false);
  });
});
