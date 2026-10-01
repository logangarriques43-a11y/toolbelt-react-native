/**
 * RevenueCatInit — minimal RevenueCat bootstrap (no UI).
 *
 * Configures Purchases once on startup with the Android public SDK key, then
 * keeps RevenueCat's app_user_id in sync with the Firebase UID (logIn on sign
 * in, logOut on sign out) so a future paywall + the backend can map purchases
 * to the right business. Renders nothing.
 *
 * No-ops when purchases aren't available (Expo Go / non-Android / no key), so
 * it's safe to mount unconditionally.
 */

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useRef } from 'react';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

import { PURCHASES_AVAILABLE, REVENUECAT_ANDROID_API_KEY } from '@/config/revenuecat';
import { auth } from '@/lib/firebase';

export function RevenueCatInit() {
  const configured = useRef(false);

  useEffect(() => {
    if (!PURCHASES_AVAILABLE) return;

    if (!configured.current) {
      Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey: REVENUECAT_ANDROID_API_KEY });
      configured.current = true;
    }

    // Tie RevenueCat identity to the Firebase user: app_user_id == Firebase UID.
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!configured.current) return;
      if (user) {
        Purchases.logIn(user.uid).catch(() => {});
      } else {
        Purchases.logOut().catch(() => {});
      }
    });
    return unsub;
  }, []);

  return null;
}
