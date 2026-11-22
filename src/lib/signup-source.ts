/**
 * Where a new owner signed up from. Phones report only the platform (store
 * installs carry no link parameters); the browser build
 * (`signup-source.web.ts`) also remembers the `?ref=` / UTM tags of the link
 * that brought them in.
 */

import { Platform } from 'react-native';

import type { SignupSource } from '@/api/onboarding';

/** Browser only: remember the landing link's tags. No-op on phones. */
export function captureSignupSource(): void {}

export function getSignupSource(): SignupSource {
  return { platform: Platform.OS === 'ios' ? 'ios' : 'android' };
}

/** Forget the remembered tags once they've been reported. */
export function clearSignupSource(): void {}
