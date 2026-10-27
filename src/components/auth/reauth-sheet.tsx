/**
 * ReauthSheet — "Confirm it's you" before a sensitive change (adding or
 * removing a two-step method) when Firebase answers `auth/requires-recent-login`.
 * Re-authenticates with the account password; if the account has two-step
 * sign-in, the same sheet then asks for the authenticator code and resolves the
 * MFA challenge. Calls `onConfirmed` once the session is fresh.
 */

import {
  EmailAuthProvider,
  getMultiFactorResolver,
  reauthenticateWithCredential,
  TotpMultiFactorGenerator,
  type MultiFactorError,
  type MultiFactorResolver,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CodeField } from '@/components/auth/code-field';
import { FormSheet } from '@/components/auth/form-sheet';
import { AuthField } from '@/components/auth-field';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

export function ReauthSheet({
  visible,
  onClose,
  onConfirmed,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const theme = useAppTheme();
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setCode('');
      setResolver(null);
      setError('');
    }
  }, [visible]);

  const confirmPassword = async () => {
    const user = auth.currentUser;
    if (!user?.email) return setError('This account has no email password to confirm. Sign out and sign back in instead.');
    if (!password) return setError('Enter your password.');
    setBusy(true);
    setError('');
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      onConfirmed();
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/multi-factor-auth-required') {
        setResolver(getMultiFactorResolver(auth, e as MultiFactorError));
      } else {
        setError(firebaseAuthErrorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (!resolver) return;
    const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) return setError("Your second step is a text message, which this app can't receive. Sign out and recover with a backup code.");
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setError('');
    try {
      await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
      onConfirmed();
    } catch (e) {
      setError(firebaseAuthErrorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet visible={visible} title="Confirm It’s You" onClose={onClose}>
      <View style={styles.head}>
        <ThemedIconTile name="lock.fill" size={56} filled />
        <Text style={[styles.message, { color: theme.secondaryText }]}>
          {resolver
            ? 'Enter the 6-digit code from your authenticator app to continue.'
            : 'For your security, enter your password to change two-step sign-in.'}
        </Text>
      </View>
      {resolver ? (
        <CodeField value={code} onChangeText={setCode} onSubmit={confirmCode} />
      ) : (
        <AuthField
          title="Password"
          icon="lock.fill"
          value={password}
          onChangeText={setPassword}
          secure
          placeholder="Your current password"
          autoFocus
          onSubmitEditing={confirmPassword}
        />
      )}
      {error ? <ErrorBanner message={error} /> : null}
      <ThemedButton title="Continue" onPress={resolver ? confirmCode : confirmPassword} loading={busy} />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 14, paddingTop: 8 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
