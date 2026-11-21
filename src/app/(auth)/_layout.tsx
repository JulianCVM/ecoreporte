import { Stack } from 'expo-router';

// Sin sesión, la guarda de la raíz manda aquí y se abre primero el inicio de sesión.
export const unstable_settings = { anchor: 'iniciar-sesion' };

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
