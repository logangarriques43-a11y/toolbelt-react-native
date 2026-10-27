/**
 * TotpEnrollSheet — authenticator-app (TOTP) setup via Firebase MFA, then the
 * backup codes. Port of the iOS authenticator setup flow.
 *
 * 1. multiFactor(user).getSession() → TotpMultiFactorGenerator.generateSecret.
 * 2. The app has no QR library, so the user either taps "Open in authenticator
 *    app" (the otpauth:// URL, which Google Authenticator / Authy / 1Password
 *    handle) or copies the setup key and pastes it into their app.
 * 3. They type the 6-digit code → assertionForEnrollment → enroll.
 * 4. A fresh set of backup codes is generated, stored (hashed) on the server and
 *    shown once; Done records twoFactorSetupComplete in the onboarding blob.
 *
 * Firebase needs a recent sign-in to enroll: on `auth/requires-recent-login`
 * the parent is asked to re-confirm identity (`onNeedsReauth`) and reopen.
 * Enrolling doesn't upgrade the current token, so the backend's 2FA-gated
 * routes need one more sign-in — the final step says so.
 */

import * as Clipboard from 'expo-clipboard';
import {
  multiFactor,
  sendEmailVerification,
  TotpMultiFactorGenerator,
  type TotpSecret,
} from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import {
  generateBackupCodes,
  markTwoFactorSetupComplete,
  storeBackupCodes,
} from '@/api/auth-recovery';
import { BackupCodesList } from '@/components/auth/backup-codes-list';
import { CodeField } from '@/components/auth/code-field';
import { FormSheet } from '@/components/auth/form-sheet';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

type Step = 'loading' | 'scan' | 'codes' | 'error';

function groupKey(key: string): string {
  return key.replace(/(.{4})/g, '$1 ').trim();
}

export function TotpEnrollSheet({
  visible,
  onClose,
  onNeedsReauth,
  onFinished,
}: {
  visible: boolean;
  onClose: () => void;
  onNeedsReauth: () => void;
  onFinished: () => void;
}) {
  const theme = useAppTheme();
  const { completeTwoFactorSetup } = useSession();
  const [step, setStep] = useState<Step>('loading');
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);
  // Held in a ref so a parent re-render (new callback) doesn't restart setup.
  const needsReauthRef = useRef(onNeedsReauth);
  needsReauthRef.current = onNeedsReauth;

  const start = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setStep('loading');
    setError('');
    setErrorCode('');
    setCode('');
    try {
      const session = await multiFactor(user).getSession();
      setSecret(await TotpMultiFactorGenerator.generateSecret(session));
      setStep('scan');
    } catch (e) {
      const c = firebaseErrorCode(e);
      if (c === 'auth/requires-recent-login') {
        needsReauthRef.current();
        return;
      }
      setErrorCode(c);
      setError(firebaseAuthErrorMessage(e));
      setStep('error');
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setCodes([]);
      setCodesSaved(false);
      void start();
    }
  }, [visible, start]);

  const otpauthUrl = secret ? secret.generateQrCodeUrl(auth.currentUser?.email ?? 'ToolBelt', 'ToolBelt') : '';

  const openInApp = async () => {
    try {
      await Linking.openURL(otpauthUrl);
    } catch {
      setError('No authenticator app on this phone opened the link. Install one (e.g. Google Authenticator), or copy the setup key instead.');
    }
  };

  const copyKey = async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret.secretKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveCodes = async (fresh: string[]) => {
    setBusy(true);
    setError('');
    try {
      await storeBackupCodes(fresh);
      setCodesSaved(true);
    } catch (e) {
      setError(`Two-step sign-in is on, but your backup codes couldn't be saved: ${firebaseAuthErrorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    const user = auth.currentUser;
    if (!user || !secret || busy) return;
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setError('');
    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await multiFactor(user).enroll(assertion, 'Authenticator app');
      const fresh = generateBackupCodes();
      setCodes(fresh);
      setStep('codes');
      setBusy(false);
      await saveCodes(fresh);
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/requires-recent-login') {
        setBusy(false);
        needsReauthRef.current();
        return;
      }
      setError(firebaseAuthErrorMessage(e));
      setCode('');
      setBusy(false);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await markTwoFactorSetupComplete();
    } catch {
      // The factor is enrolled in Firebase either way; the flag only mirrors it.
    } finally {
      setBusy(false);
    }
    completeTwoFactorSetup();
    onFinished();
  };

  const resendVerification = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setError(`We sent a new verification link to ${user.email}. Open it, then come back and tap Try Again.`);
    } catch (e) {
      setError(firebaseAuthErrorMessage(e));
    }
  };

  const retry = async () => {
    await auth.currentUser?.reload().catch(() => {});
    void start();
  };

  return (
    <FormSheet
      visible={visible}
      title="Authenticator App"
      onClose={onClose}
      closeLabel={step === 'codes' ? 'Close' : 'Cancel'}>
      {step === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.body, { color: theme.secondaryText }]}>Preparing your setup key…</Text>
        </View>
      ) : null}

      {step === 'error' ? (
        <View style={styles.block}>
          <ErrorBanner message={error} />
          {errorCode === 'auth/unverified-email' ? (
            <ThemedButton title="Resend Verification Email" kind="quiet" icon="envelope.fill" onPress={resendVerification} />
          ) : null}
          <ThemedButton title="Try Again" onPress={retry} />
        </View>
      ) : null}

      {step === 'scan' && secret ? (
        <View style={styles.block}>
          <Step n={1} title="Add ToolBelt to your authenticator">
            Tap the button to open your authenticator app, or copy the setup key and add it there manually
            (choose “Enter a setup key”, time-based).
          </Step>
          <ThemedButton title="Open in Authenticator App" icon="arrow.up.right.square" onPress={openInApp} />
          <View style={[theme.card, styles.keyCard]}>
            <Text style={[styles.keyLabel, { color: theme.secondaryText }]}>Setup key</Text>
            <Text selectable style={[styles.key, { color: theme.primaryText }]}>
              {groupKey(secret.secretKey)}
            </Text>
            <ThemedButton title={copied ? 'Copied' : 'Copy Key'} icon="doc.on.doc" kind="quiet" onPress={copyKey} />
          </View>
          <Step n={2} title="Enter the 6-digit code">
            Type the code your app shows for ToolBelt to finish.
          </Step>
          <CodeField value={code} onChangeText={setCode} onSubmit={verify} autoFocus={false} />
          {error ? <ErrorBanner message={error} /> : null}
          <ThemedButton title="Verify & Turn On" onPress={verify} loading={busy} disabled={code.length !== 6} />
        </View>
      ) : null}

      {step === 'codes' ? (
        <View style={styles.block}>
          <View style={styles.center}>
            <ThemedIconTile name="checkmark.shield.fill" size={56} filled />
            <Text style={theme.display(24)}>Two-step sign-in is on</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>
              Next time you sign in, ToolBelt will ask for a code from your authenticator app. Sign out and back
              in once to unlock payments and payouts on this phone.
            </Text>
          </View>
          <Text style={theme.display(20)}>Your backup codes</Text>
          {codes.length ? <BackupCodesList codes={codes} /> : null}
          {error ? <ErrorBanner message={error} /> : null}
          {!codesSaved && !busy && error ? (
            <ThemedButton title="Retry Saving Codes" kind="quiet" onPress={() => saveCodes(codes)} />
          ) : null}
          <ThemedButton title="Done" onPress={finish} loading={busy} disabled={!codesSaved && !error} />
        </View>
      ) : null}
    </FormSheet>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.step}>
      <View style={[styles.stepBadge, { backgroundColor: theme.accentSoft }]}>
        <Text style={[styles.stepNum, { color: theme.accent }]}>{n}</Text>
      </View>
      <View style={styles.stepText}>
        <Text style={[styles.stepTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  block: { gap: 16 },
  body: { fontSize: 14, lineHeight: 20 },
  keyCard: { padding: 16, gap: 10 },
  keyLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  key: { fontSize: 18, fontFamily: 'monospace', letterSpacing: 1 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, gap: 4 },
  stepTitle: { fontSize: 15, fontWeight: '600' },
});
