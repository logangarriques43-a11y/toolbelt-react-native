/**
 * Browser-only Firebase Auth dependencies. Phones use AsyncStorage persistence
 * (set up in `firebase.ts`), so this returns null; the browser build's
 * `firebase-web-auth.web.ts` returns IndexedDB persistence instead.
 */

import type { Dependencies } from 'firebase/auth';

export function webAuthDependencies(): Dependencies | null {
  return null;
}
