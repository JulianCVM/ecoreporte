import { Linking, StyleSheet } from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

type Props = {
  /** `ask`: se puede mostrar el diálogo del sistema. `blocked`: solo se activa en los ajustes. */
  access: 'ask' | 'blocked';
  /** Pide el permiso al sistema (solo se usa con `ask`). */
  onRequest: () => void;
  /** Recibe el mensaje si no se pudieron abrir los ajustes. */
  onError: (message: string) => void;
};

/** Explica por qué hace falta la cámara y cómo activar el permiso cuando está negado (issue #8). */
export function CameraPermissionNotice({ access, onRequest, onError }: Props) {
  const blocked = access === 'blocked';

  function openSettings() {
    Linking.openSettings().catch((cause: unknown) => {
      onError(`No se pudieron abrir los ajustes: ${String(cause)}`);
    });
  }

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">
        {blocked ? '⚠ El permiso de cámara está negado' : 'EcoReporte necesita la cámara'}
      </ThemedText>
      <ThemedText type="small">
        {blocked
          ? 'Para activarlo, abre los ajustes de la app, entra a «Permisos», toca «Cámara» y elige «Permitir solo mientras se usa la app». Después vuelve a esta pantalla.'
          : 'La foto del reporte se toma en el momento, desde la app. La cámara solo se usa mientras esta pantalla está abierta.'}
      </ThemedText>
      <PrimaryButton
        label={blocked ? 'Abrir los ajustes' : 'Permitir la cámara'}
        onPress={blocked ? openSettings : onRequest}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two, padding: Spacing.three, borderRadius: Spacing.three },
});
