import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

import { AuthActionError, signOut } from '../data/auth-repository';
import { useSession } from '../data/use-session';
import { FormError } from './form-error';

/** Quién inició sesión y el botón para salir (pantalla Perfil). */
export function SessionCard() {
  const session = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session.status !== 'signed-in') return null;
  const { displayName, email } = session.user;

  async function handleSignOut() {
    setLoading(true);
    setError(null);
    try {
      await signOut();
    } catch (cause) {
      setError(cause instanceof AuthActionError ? cause.message : String(cause));
      setLoading(false);
    }
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{displayName ?? 'Sin nombre'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {email}
      </ThemedText>
      <FormError message={error} />
      <PrimaryButton
        label="Cerrar sesión"
        variant="secondary"
        loading={loading}
        onPress={handleSignOut}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
});
