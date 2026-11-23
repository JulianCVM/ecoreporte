import { Linking } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';

/** Textos del aviso para un permiso concreto (cámara, ubicación). */
export type PermissionNoticeTexts = {
  /** Título y explicación antes de mostrar el diálogo del sistema. */
  askTitle: string;
  askBody: string;
  askLabel: string;
  /** Título y pasos para activarlo en los ajustes cuando ya está negado. */
  blockedTitle: string;
  blockedBody: string;
};

type Props = {
  /** `ask`: se puede mostrar el diálogo del sistema. `blocked`: solo se activa en los ajustes. */
  access: 'ask' | 'blocked';
  texts: PermissionNoticeTexts;
  /** Pide el permiso al sistema (solo se usa con `ask`). */
  onRequest: () => void;
  /** Recibe el mensaje si no se pudieron abrir los ajustes. */
  onError: (message: string) => void;
};

/** Explica por qué hace falta un permiso y cómo activarlo cuando está negado (issues #8 y #9). */
export function PermissionNotice({ access, texts, onRequest, onError }: Props) {
  const blocked = access === 'blocked';

  function openSettings() {
    Linking.openSettings().catch((cause: unknown) => {
      onError(`No se pudieron abrir los ajustes: ${String(cause)}`);
    });
  }

  return (
    <Card>
      <ThemedText type="smallBold">
        {blocked ? `⚠ ${texts.blockedTitle}` : texts.askTitle}
      </ThemedText>
      <ThemedText type="small">{blocked ? texts.blockedBody : texts.askBody}</ThemedText>
      <PrimaryButton
        label={blocked ? 'Abrir los ajustes' : texts.askLabel}
        onPress={blocked ? openSettings : onRequest}
      />
    </Card>
  );
}
