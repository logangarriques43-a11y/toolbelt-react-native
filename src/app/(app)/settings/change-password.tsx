/**
 * Change Password — port of the iOS ChangePasswordView. No backend involved:
 * Firebase reauthenticateWithCredential(email, current) proves it's the owner
 * (or staff member), then updatePassword sets the new one (8+ characters).
 * An account with two-step sign-in is asked for its authenticator code during
 * the re-authentication. "Forgot password?" sends Firebase's reset email.
 */

import {
  EmailAuthProvider,
  getMultiFactorResolver,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  TotpMultiFactorGenerator,
  updatePassword,
  type MultiFactorError,
  type MultiFactorResolver,
} from 'firebase/auth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TotpCodeSheet } from '@/components/auth/totp-code-sheet';
import { AuthField } from '@/components/auth-field';
import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

export default function ChangePassword() {
  const theme = useAppTheme();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);

  const email = auth.currentUser?.email ?? '';

  const finish = async () => {
    const user = auth.currentUser;
    if (!user) return;
    await updatePassword(user, next);
    Alert.alert('Password changed', 'Use your new password the next time you sign in.');
    router.back();
  };

  const save = async () => {
    if (saving) return;
    setError('');
    const user = auth.currentUser;
    if (!user || !email) return setError('This account has no email password to change.');
    if (!current) return setError('Enter your current password.');
    if (next.length < 8) return setError('New password must be at least 8 characters.');
    if (next !== confirm) return setError("New passwords don't match.");
    if (next === current) return setError('Choose a password different from your current one.');
    setSaving(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(email, current));
      await finish();
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/multi-factor-auth-required') {
        setResolver(getMultiFactorResolver(auth, e as MultiFactorError));
      } else {
        setError(
          firebaseErrorCode(e) === 'auth/invalid-credential' || firebaseErrorCode(e) === 'auth/wrong-password'
            ? 'Your current password is incorrect.'
            : firebaseAuthErrorMessage(e),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const forgot = async () => {
    if (!email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('Check your email', `We sent a password reset link to ${email}.`);
    } catch (e) {
      Alert.alert("Couldn't Send Email", firebaseAuthErrorMessage(e));
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <ScreenHeader title="Change Password" />
        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <ThemedIconTile name="lock.fill" size={64} filled />
            {email ? <Text style={[styles.email, { color: theme.secondaryText }]}>{email}</Text> : null}
          </View>
          <View style={[theme.card, styles.form]}>
            <AuthField
              title="Current Password"
              icon="lock.fill"
              value={current}
              onChangeText={setCurrent}
              secure
              required
              placeholder="Your current password"
              autoComplete="current-password"
            />
            <AuthField
              title="New Password"
              icon="lock.fill"
              value={next}
              onChangeText={setNext}
              secure
              required
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <AuthField
              title="Confirm New Password"
              icon="lock.fill"
              value={confirm}
              onChangeText={setConfirm}
              secure
              required
              placeholder="Type it again"
              autoComplete="new-password"
              onSubmitEditing={save}
            />
            <Pressable style={styles.forgotRow} onPress={forgot} hitSlop={8}>
              <Text style={[styles.forgot, { color: theme.accent }]}>Forgot password?</Text>
            </Pressable>
          </View>
          {error ? <ErrorBanner message={error} /> : null}
          <ThemedButton title="Update Password" kind="inverse" onPress={save} loading={saving} />
        </KeyboardAwareForm>
      </SafeAreaView>

      <TotpCodeSheet
        visible={!!resolver}
        title="Confirm It’s You"
        onClose={() => setResolver(null)}
        onSubmit={async (code) => {
          if (!resolver) return;
          const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
          if (!hint) throw new Error("Your second step is a text message, which this app can't receive.");
          await resolver.resolveSignIn(TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code));
          setResolver(null);
          try {
            await finish();
          } catch (e) {
            setError(firebaseAuthErrorMessage(e));
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  head: { alignItems: 'center', gap: 10 },
  email: { fontSize: 14 },
  form: { padding: 20, gap: 18 },
  forgotRow: { alignSelf: 'flex-end' },
  forgot: { fontSize: 14, fontWeight: '500' },
});
