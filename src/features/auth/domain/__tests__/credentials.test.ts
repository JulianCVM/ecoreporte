import { validateSignIn, validateSignUp } from '../credentials';
import { DISPLAY_NAME_MAX_CHARS, PASSWORD_MIN_LENGTH } from '../limits';

const validSignUp = {
  displayName: 'Ana Gómez',
  email: 'ana@example.com',
  password: 'clave-segura-1',
  passwordConfirmation: 'clave-segura-1',
};

describe('validateSignIn', () => {
  it('limpia el correo: sin espacios y en minúsculas', () => {
    const result = validateSignIn({ email: '  Ana@Example.COM ', password: 'x' });
    expect(result).toEqual({ ok: true, data: { email: 'ana@example.com', password: 'x' } });
  });

  it('pide el correo y la contraseña si faltan', () => {
    expect(validateSignIn({ email: '', password: '' })).toEqual({
      ok: false,
      fieldErrors: { email: 'Escribe tu correo.', password: 'Escribe tu contraseña.' },
    });
  });

  it('rechaza un correo sin dominio', () => {
    const result = validateSignIn({ email: 'ana@', password: 'x' });
    expect(result).toMatchObject({ ok: false, fieldErrors: { email: 'El correo no es válido.' } });
  });

  it('no exige el mínimo de longitud al entrar (cuentas creadas antes)', () => {
    expect(validateSignIn({ email: 'ana@example.com', password: '123' }).ok).toBe(true);
  });
});

describe('validateSignUp', () => {
  it('acepta un registro completo y recorta el nombre', () => {
    const result = validateSignUp({ ...validSignUp, displayName: '  Ana Gómez  ' });
    expect(result).toMatchObject({ ok: true, data: { displayName: 'Ana Gómez' } });
  });

  it('exige la longitud mínima de la contraseña', () => {
    const short = 'a'.repeat(PASSWORD_MIN_LENGTH - 1);
    const result = validateSignUp({ ...validSignUp, password: short, passwordConfirmation: short });
    expect(result).toMatchObject({ ok: false, fieldErrors: { password: expect.any(String) } });
  });

  it('avisa en la confirmación cuando las contraseñas no coinciden', () => {
    const result = validateSignUp({ ...validSignUp, passwordConfirmation: 'otra-clave-123' });
    expect(result).toEqual({
      ok: false,
      fieldErrors: { passwordConfirmation: 'Las contraseñas no coinciden.' },
    });
  });

  it('limita el nombre por arriba y por abajo, contando sin espacios de los bordes', () => {
    const long = 'a'.repeat(DISPLAY_NAME_MAX_CHARS + 1);
    expect(validateSignUp({ ...validSignUp, displayName: long }).ok).toBe(false);
    expect(validateSignUp({ ...validSignUp, displayName: '  A  ' }).ok).toBe(false);
  });

  it('muestra un solo mensaje por campo, el primero', () => {
    const result = validateSignUp({ ...validSignUp, email: '' });
    expect(result).toEqual({ ok: false, fieldErrors: { email: 'Escribe tu correo.' } });
  });
});
