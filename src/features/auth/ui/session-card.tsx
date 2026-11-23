import { useState } from 'react';

import { Card } from '@/components/card';
import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';

import { unregisterDevice } from '@/features/notifications/data/push-repository';
import { reportError } from '@/lib/observability/errors';

import { AuthActionError, signOut } from '../data/auth-repository';
import { useSession } from '../data/use-session';
import { isStaff, roleLabel } from '../domain/role';

/** Quién inició sesión y el botón para salir (pantalla Perfil). */
export function SessionCard() {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session.status !== 'signed-in') return null;
  const { uid, displayName, email, role } = session.user;

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    try {
      // Con la sesión todavía abierta: después las reglas ya no dejan tocar el documento.
      await unregisterDevice(uid).catch((cause: unknown) => {
        reportError('[push] no se pudo quitar el token de este dispositivo', cause);
      });
      await signOut();
    } catch (cause) {
      setError(cause instanceof AuthActionError ? cause.message : String(cause));
      setLoading(false);
    }
  }

  return (
    <Card>
      <ThemedText type="smallBold">{displayName ?? 'Sin nombre'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {email}
      </ThemedText>
      {isStaff(role) ? <ThemedText type="small">Rol: {roleLabel(role)}</ThemedText> : null}
      <FormError message={error} />
      <PrimaryButton
        label="Cerrar sesión"
        variant="secondary"
        loading={loading}
        onPress={handleSignOut}
      />
    </Card>
  );
}
