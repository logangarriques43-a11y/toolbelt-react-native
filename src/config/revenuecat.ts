/**
 * RevenueCat configuration (Google Play Billing on Android).
 *
 * The key is RevenueCat's PUBLIC Android SDK key (safe to embed in the client,
 * like the EXPO_PUBLIC_* Firebase config) — NOT a secret. From RevenueCat
 * dashboard → Project → API keys → Android (Google Play).
 *
 * This is the minimal SDK integration: it gets the Google Play Billing library
 * into the Android build (so Play lets us create subscription products) and
 * ties RevenueCat's app_user_id to the Firebase UID. The paywall / offerings /
 * entitlement UI comes later.
 *
 * RevenueCat's native module isn't present in Expo Go and we only have an
 * Android key, so purchases are only "available" in a real Android build with
 * the key set; everywhere else it no-ops.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/** Entitlement that unlocks the AI SMS assistant (RevenueCat dashboard). */
export const AI_SMS_ENTITLEMENT = 'ai_sms';
/** Offering holding the four AI SMS plan packages. */
export const AI_SMS_OFFERING = 'default';

export const PURCHASES_AVAILABLE =
  Platform.OS === 'android' &&
  Constants.appOwnership !== 'expo' && // 'expo' == running inside Expo Go
  REVENUECAT_ANDROID_API_KEY.length > 0;
