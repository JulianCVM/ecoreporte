import { useEffect, useState } from 'react';

import { auth, getIdTokenResult, onIdTokenChanged, type User } from '@/lib/firebase';
import { reportError } from '@/lib/observability/errors';

import { roleFromClaims, type Role } from '../domain/role';

/** Datos de la sesión que usan las pantallas; nunca el `User` del SDK completo. */
export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** Sale del custom claim del token; ocultar una pantalla con él no es un permiso. */
  role: Role;
};

export type Session =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: SessionUser };

async function toSession(user: User | null): Promise<Session> {
  if (!user) return { status: 'signed-out' };
  let role: Role = 'citizen';
  try {
    role = roleFromClaims((await getIdTokenResult(user)).claims);
  } catch (cause) {
    // Sin claims la sesión sigue siendo válida: entra como ciudadano, el permiso menor.
    reportError('[auth] no se pudieron leer los claims del token', cause);
  }
  return {
    status: 'signed-in',
    user: { uid: user.uid, email: user.email, displayName: user.displayName, role },
  };
}

/**
 * Sesión actual de Firebase Auth, en vivo. Empieza en `loading` hasta que el SDK restaura la
 * sesión guardada en el dispositivo, para no mostrar el inicio de sesión a quien ya entró.
 *
 * Escucha `onIdTokenChanged` y no `onAuthStateChanged`: además de entrar y salir, avisa cuando
 * el token se renueva, que es como llegan el nombre recién puesto y, más adelante, el rol.
 */
export function useSession(): Session {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    // Leer los claims es asíncrono: si llega otro cambio antes, el resultado viejo se descarta.
    let latest = 0;
    const stop = onIdTokenChanged(auth(), (user) => {
      const current = (latest += 1);
      void toSession(user).then((next) => {
        if (current === latest) setSession(next);
      });
    });
    return () => {
      latest = -1;
      stop();
    };
  }, []);

  return session;
}
