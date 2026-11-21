import { useEffect, useState } from 'react';

import { auth, onIdTokenChanged, type User } from '@/lib/firebase';

/** Datos de la sesión que usan las pantallas; nunca el `User` del SDK completo. */
export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type Session =
  { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: SessionUser };

function toSession(user: User | null): Session {
  if (!user) return { status: 'signed-out' };
  return {
    status: 'signed-in',
    user: { uid: user.uid, email: user.email, displayName: user.displayName },
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

  useEffect(() => onIdTokenChanged(auth(), (user) => setSession(toSession(user))), []);

  return session;
}
