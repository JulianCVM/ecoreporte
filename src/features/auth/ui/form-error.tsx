import { ThemedText } from '@/components/themed-text';

/** Error general del formulario (por ejemplo, credenciales incorrectas), anunciado al lector. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <ThemedText
      type="smallBold"
      themeColor="danger"
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      ⚠ {message}
    </ThemedText>
  );
}
