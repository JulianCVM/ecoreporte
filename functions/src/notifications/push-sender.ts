import type { Messaging } from 'firebase-admin/messaging';

import type { PushMessage } from './push-message';

/** Envío de avisos, detrás de una interfaz para probar sin FCM (que no tiene emulador). */
export interface PushSender {
  /**
   * Envía el aviso a cada token.
   *
   * @returns Los tokens que FCM ya no reconoce, para borrarlos del usuario.
   */
  sendToTokens(tokens: string[], message: PushMessage): Promise<{ staleTokens: string[] }>;
  sendToTopic(topic: string, message: PushMessage): Promise<void>;
}

// Códigos con los que FCM dice que un token ya no sirve (app desinstalada o token renovado).
const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

/** `PushSender` sobre FCM con el Admin SDK. */
export class FcmPushSender implements PushSender {
  constructor(private readonly messaging: Messaging) {}

  async sendToTokens(tokens: string[], message: PushMessage): Promise<{ staleTokens: string[] }> {
    const { title, body, data } = message;
    const batch = await this.messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });
    const staleTokens: string[] = [];
    batch.responses.forEach((response, index) => {
      if (response.success) return;
      const token = tokens[index];
      if (token && response.error && STALE_TOKEN_CODES.has(response.error.code)) {
        staleTokens.push(token);
        return;
      }
      console.error('[push] FCM rechazó un envío', response.error?.code, response.error?.message);
    });
    return { staleTokens };
  }

  async sendToTopic(topic: string, message: PushMessage): Promise<void> {
    const { title, body, data } = message;
    await this.messaging.send({ topic, notification: { title, body }, data });
  }
}
