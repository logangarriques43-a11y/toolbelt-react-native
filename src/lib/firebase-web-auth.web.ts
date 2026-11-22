/**
 * Firebase Auth setup for the browser build: keep the session across reloads
 * in IndexedDB (falling back to localStorage), like Firebase's default web
 * setup, plus the popup/redirect resolver web sign-in flows need.
 */

import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  type Dependencies,
} from 'firebase/auth';

export function webAuthDependencies(): Dependencies | null {
  return {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  };
}
