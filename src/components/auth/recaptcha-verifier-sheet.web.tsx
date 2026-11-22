/**
 * reCAPTCHA verifier for Firebase SMS codes — browser version.
 *
 * In a browser the Firebase SDK's own `RecaptchaVerifier` works directly
 * against the page DOM, so there's no WebView: we render an empty container and
 * hand Firebase an invisible verifier bound to it. Same exports and contract as
 * `recaptcha-verifier-sheet.tsx` (`verifier` for `verifyPhoneNumber`,
 * `sheet` to render). The verifier is created lazily on first use (the
 * container must be in the DOM) and recreated after each request, because
 * Firebase won't reuse a solved invisible challenge.
 *
 * Needs the web origin (app.toolbelt.tools) listed under Firebase Console →
 * Authentication → Settings → Authorized domains.
 */

import { RecaptchaVerifier, type ApplicationVerifier } from 'firebase/auth';
import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import { View } from 'react-native';

import { auth } from '@/lib/firebase';

export class RecaptchaCancelledError extends Error {
  constructor() {
    super('Verification cancelled');
    this.name = 'RecaptchaCancelledError';
  }
}

let containerSeq = 0;

export function useRecaptchaVerifier(): { verifier: ApplicationVerifier; sheet: ReactElement } {
  const containerId = useMemo(() => `recaptcha-container-${++containerSeq}`, []);
  const inner = useRef<RecaptchaVerifier | null>(null);

  useEffect(
    () => () => {
      inner.current?.clear();
      inner.current = null;
    },
    [],
  );

  const verifier = useMemo(() => {
    const fresh = () => {
      inner.current?.clear();
      inner.current = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
      return inner.current;
    };
    const v = {
      type: 'recaptcha',
      verify: () => fresh().verify(),
      _reset: () => {
        inner.current?.clear();
        inner.current = null;
      },
    };
    return v as unknown as ApplicationVerifier;
  }, [containerId]);

  return { verifier, sheet: <View nativeID={containerId} /> };
}
