/**
 * reCAPTCHA verifier for Firebase SMS codes.
 *
 * Firebase only sends an SMS code (including the second-factor code for an
 * owner who chose "Text message" two-step sign-in on iOS) after an
 * ApplicationVerifier hands it a reCAPTCHA token. The SDK's own
 * RecaptchaVerifier needs a browser DOM, which React Native doesn't have, so
 * this shows the reCAPTCHA checkbox in a WebView served from the project's
 * auth domain (the domain the reCAPTCHA key is registered for) and passes the
 * token back to the SDK.
 *
 * Usage: `const recaptcha = useRecaptchaVerifier();` then render
 * `recaptcha.sheet` and pass `recaptcha.verifier` to `verifyPhoneNumber`.
 * Closing the sheet rejects with `RecaptchaCancelledError`.
 */

import type { ApplicationVerifier } from 'firebase/auth';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { FormSheet } from '@/components/auth/form-sheet';
import { ErrorBanner } from '@/components/error-banner';
import { firebaseConfig } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

/** Firebase compat build loaded inside the WebView (only RecaptchaVerifier is used). */
const FIREBASE_WEB_SDK = '10.12.2';

/** The person closed the reCAPTCHA sheet; no SMS was sent. */
export class RecaptchaCancelledError extends Error {
  constructor() {
    super('Verification cancelled');
    this.name = 'RecaptchaCancelledError';
  }
}

type WebMessage =
  | { type: 'ready' }
  | { type: 'token'; token: string }
  | { type: 'expired' }
  | { type: 'error'; message: string };

function recaptchaHtml(): string {
  const config = JSON.stringify({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
  });
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script src="https://www.gstatic.com/firebasejs/${FIREBASE_WEB_SDK}/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/${FIREBASE_WEB_SDK}/firebase-auth-compat.js"></script>
<style>html,body{margin:0;background:transparent}body{display:flex;justify-content:center;padding-top:24px}</style>
</head><body>
<div id="recaptcha"></div>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
function fail(e){send({type:'error',message:String((e&&e.message)||e)});}
try {
  firebase.initializeApp(${config});
  var verifier = new firebase.auth.RecaptchaVerifier('recaptcha', {
    size: 'normal',
    callback: function (token) { send({type:'token', token: token}); },
    'expired-callback': function () { send({type:'expired'}); }
  });
  verifier.render().then(function () { send({type:'ready'}); }, fail);
} catch (e) { fail(e); }
</script>
</body></html>`;
}

interface Pending {
  resolve: (token: string) => void;
  reject: (e: Error) => void;
}

export function useRecaptchaVerifier(): { verifier: ApplicationVerifier; sheet: ReactElement } {
  const theme = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  /** Remount the WebView for each request so an old token is never reused. */
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<Pending | null>(null);

  const finish = (outcome: { token: string } | { error: Error }) => {
    const p = pending.current;
    pending.current = null;
    setVisible(false);
    if (!p) return;
    if ('token' in outcome) p.resolve(outcome.token);
    else p.reject(outcome.error);
  };

  const verifier = useMemo(() => {
    const v = {
      type: 'recaptcha',
      verify: () =>
        new Promise<string>((resolve, reject) => {
          pending.current?.reject(new RecaptchaCancelledError());
          pending.current = { resolve, reject };
          setReady(false);
          setError('');
          setAttempt((n) => n + 1);
          setVisible(true);
        }),
      // The SDK calls `_reset()` after every verifyPhoneNumber; there is no
      // widget state to clear here because each request remounts the WebView.
      _reset: () => undefined,
    };
    return v as ApplicationVerifier;
  }, []);

  const onMessage = (event: WebViewMessageEvent) => {
    let msg: WebMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data) as WebMessage;
    } catch {
      return; // Not one of ours.
    }
    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'token') finish({ token: msg.token });
    else if (msg.type === 'expired') setError('The check expired. Tap the box again.');
    else setError(`Couldn't load the verification check. ${msg.message}`);
  };

  const sheet = (
    <FormSheet visible={visible} title="Quick Check" onClose={() => finish({ error: new RecaptchaCancelledError() })}>
      <Text style={[styles.message, { color: theme.secondaryText }]}>
        Confirm you&apos;re not a robot, then we&apos;ll text your sign-in code.
      </Text>
      <View style={styles.webWrap}>
        {visible ? (
          <WebView
            key={attempt}
            source={{ html: recaptchaHtml(), baseUrl: `https://${firebaseConfig.authDomain}` }}
            originWhitelist={['*']}
            javaScriptEnabled
            onMessage={onMessage}
            onError={(e) => setError(`Couldn't load the verification check. ${e.nativeEvent.description}`)}
            style={styles.web}
          />
        ) : null}
        {visible && !ready && !error ? <ActivityIndicator style={styles.spinner} color={theme.accent} /> : null}
      </View>
      {error ? <ErrorBanner message={error} /> : null}
    </FormSheet>
  );

  return { verifier, sheet };
}

const styles = StyleSheet.create({
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21, paddingTop: 8 },
  // Tall enough for reCAPTCHA's image challenge, which opens inside the page.
  webWrap: { height: 560 },
  web: { flex: 1, backgroundColor: 'transparent' },
  spinner: { position: 'absolute', top: 40, alignSelf: 'center' },
});
