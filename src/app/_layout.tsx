import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { useSession } from '@/features/auth/data/use-session';

// Con sesión, la guarda de (auth) vuelve al ancla: las pestañas.
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useSession();
  // Mientras el SDK restaura la sesión guardada no se decide la ruta: así quien ya entró no ve
  // por un instante el inicio de sesión. La pantalla de arranque sigue visible.
  if (session.status === 'loading') return null;
  const signedIn = session.status === 'signed-in';

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Sin esto, en modo claro la hora y los íconos del sistema salían blancos sobre blanco. */}
      <StatusBar style="auto" />
      {/* Guarda de rutas (issue #6): sin sesión solo existen las pantallas de (auth). */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn} redirectTo="/iniciar-sesion">
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
