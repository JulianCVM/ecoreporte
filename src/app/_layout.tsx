import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* Sin esto, en modo claro la hora y los íconos del sistema salían blancos sobre blanco. */}
      <StatusBar style="auto" />
      <AppTabs />
    </ThemeProvider>
  );
}
