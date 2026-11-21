import Constants from 'expo-constants';

import { ScreenScaffold } from '@/components/screen-scaffold';
import { ThemedText } from '@/components/themed-text';
import { SessionCard } from '@/features/auth/ui/session-card';
import { appEnv } from '@/lib/config/env';
import { firebaseProjectId } from '@/lib/firebase';

export default function ProfileScreen() {
  const variant = String(Constants.expoConfig?.extra?.appVariant ?? 'development');
  const version = Constants.expoConfig?.version ?? '0.0.0';

  return (
    <ScreenScaffold
      title="Perfil"
      pending={['Inicio de sesión con Google', 'Bandeja del operador (RF07)']}>
      <SessionCard />
      <ThemedText type="small" themeColor="textSecondary">
        Versión {version} · variante {variant} · entorno {appEnv.env}
        {appEnv.useEmulators ? ' · emuladores' : ''}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Firebase: {firebaseProjectId()}
      </ThemedText>
    </ScreenScaffold>
  );
}
