import { ThemedText } from '@/components/themed-text';

/** Error general de un formulario o de un paso (credenciales, cámara…), anunciado al lector. */
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
