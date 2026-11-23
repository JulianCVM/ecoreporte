import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useSession } from '@/features/auth/data/use-session';
import { isStaff } from '@/features/auth/domain/role';
import { usePushNavigation } from '@/features/notifications/data/use-push-navigation';
import { usePushRegistration } from '@/features/notifications/data/use-push-registration';

// Con sesión, la guarda de (auth) vuelve al ancla: las pestañas.
export const unstable_settings = { anchor: '(tabs)' };

/** Tema de navegación con la paleta de la app: fondo de las pantallas y encabezado nativo. */
function navigationTheme(dark: boolean) {
  const base = dark ? DarkTheme : DefaultTheme;
  const colors = dark ? Colors.dark : Colors.light;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const session = useSession();
  const router = useRouter();
  const user = session.status === 'signed-in' ? session.user : null;
  usePushRegistration(user?.uid ?? null, user ? isStaff(user.role) : false);
  usePushNavigation(user !== null, (target) => {
    if (target.screen === 'report') {
      router.push({ pathname: '/reporte/[id]', params: { id: target.reportId } });
    } else {
      router.push('/operador');
    }
  });
  // Mientras el SDK restaura la sesión guardada no se decide la ruta: así quien ya entró no ve
  // por un instante el inicio de sesión. La pantalla de arranque sigue visible.
  if (session.status === 'loading') return null;
  const signedIn = session.status === 'signed-in';

  return (
    <ThemeProvider value={navigationTheme(colorScheme === 'dark')}>
      {/* Sin esto, en modo claro la hora y los íconos del sistema salían blancos sobre blanco. */}
      <StatusBar style="auto" />
      {/* Guarda de rutas (issue #6): sin sesión solo existen las pantallas de (auth). */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={signedIn} redirectTo="/iniciar-sesion">
          <Stack.Screen name="(tabs)" />
          {/* El encabezado nativo da el botón de volver; el título lo pone la pantalla. */}
          <Stack.Screen name="reporte/[id]" options={{ headerShown: true, title: '' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
