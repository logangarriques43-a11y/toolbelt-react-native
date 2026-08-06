/**
 * Firebase app + Auth (email/password) for the RN app.
 *
 * Same Firebase project (toolbelt-b2ef6) as the Swift app, so a Firebase login
 * here yields a token the backend accepts for the same business account.
 *
 * Config comes from EXPO_PUBLIC_FIREBASE_* (see .env). Auth uses AsyncStorage
 * persistence so the session survives reloads. `getReactNativePersistence` only
 * exists in Firebase's React Native build (Metro resolves it; Node can't see
 * it), so we read it defensively and fall back to default persistence rather
 * than crash if it's ever absent.
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || undefined,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// `getReactNativePersistence` is present in the RN build of @firebase/auth.
const getReactNativePersistence = (firebaseAuth as unknown as {
  getReactNativePersistence?: (storage: unknown) => unknown;
}).getReactNativePersistence;

function makeAuth(): Auth {
  try {
    return initializeAuth(
      firebaseApp,
      getReactNativePersistence
        ? { persistence: getReactNativePersistence(AsyncStorage) as never }
        : undefined,
    );
  } catch {
    // Already initialized (Fast Refresh) or persistence unavailable.
    return getAuth(firebaseApp);
  }
}

export const auth = makeAuth();
