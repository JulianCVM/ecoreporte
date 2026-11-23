// Un token por dispositivo; el mismo tope que `firestore.rules` exige en `users.fcmTokens`
// y que la función respeta al enviar (docs/03-modelo-de-datos.md).
export const MAX_FCM_TOKENS = 5;

/** Tema de FCM de los operadores; el mismo nombre que usa `onAlertCreated` en `functions/`. */
export const OPERATORS_TOPIC = 'operators';
