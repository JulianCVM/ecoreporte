import { FieldValue, type Firestore } from 'firebase-admin/firestore';

import type { TokenStore } from './notify';

const USERS = 'users';

/** `TokenStore` sobre `users/{uid}.fcmTokens` con el Admin SDK. */
export class FirestoreTokenStore implements TokenStore {
  constructor(private readonly db: Firestore) {}

  async readTokens(uid: string): Promise<unknown> {
    const snapshot = await this.db.collection(USERS).doc(uid).get();
    return snapshot.get('fcmTokens');
  }

  async removeTokens(uid: string, tokens: string[]): Promise<void> {
    await this.db
      .collection(USERS)
      .doc(uid)
      .update({ fcmTokens: FieldValue.arrayRemove(...tokens) });
  }
}
