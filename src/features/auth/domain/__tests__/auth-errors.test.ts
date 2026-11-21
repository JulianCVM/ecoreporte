import { authErrorMessage, isKnownAuthError, UNKNOWN_AUTH_ERROR } from '../auth-errors';

/** Forma de los errores del SDK nativo: un Error con `code`. */
function firebaseError(code: string) {
  return Object.assign(new Error(`[${code}] mensaje en inglés`), { code });
}

describe('authErrorMessage', () => {
  it('da el mismo mensaje para correo inexistente y contraseña mala (sin enumerar cuentas)', () => {
    const messages = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].map(
      (code) => authErrorMessage(firebaseError(code)),
    );
    expect(new Set(messages)).toEqual(new Set(['Correo o contraseña incorrectos.']));
  });

  it('traduce el correo repetido al registrarse', () => {
    expect(authErrorMessage(firebaseError('auth/email-already-in-use'))).toBe(
      'Ya existe una cuenta con ese correo.',
    );
  });

  it('nunca muestra el mensaje en inglés del SDK', () => {
    expect(authErrorMessage(firebaseError('auth/internal-error'))).toBe(UNKNOWN_AUTH_ERROR);
  });

  it('acepta cualquier cosa lanzada, no solo errores de Firebase', () => {
    expect(authErrorMessage('texto')).toBe(UNKNOWN_AUTH_ERROR);
    expect(authErrorMessage(null)).toBe(UNKNOWN_AUTH_ERROR);
    expect(authErrorMessage({ code: 42 })).toBe(UNKNOWN_AUTH_ERROR);
  });
});

describe('isKnownAuthError', () => {
  it('distingue los errores esperables de los que hay que registrar', () => {
    expect(isKnownAuthError(firebaseError('auth/too-many-requests'))).toBe(true);
    expect(isKnownAuthError(firebaseError('auth/internal-error'))).toBe(false);
    expect(isKnownAuthError(new Error('sin código'))).toBe(false);
  });
});
