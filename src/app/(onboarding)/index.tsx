/**
 * Set New Password — the forced step before the app opens. Port of the iOS
 * staff "Set New Password" screen, also used after an owner recovers with a
 * backup code (the server asks for a fresh password then).
 *
 * New password (8+) + confirm → Firebase updatePassword; staff then tell the
 * backend (POST /staff/me/password-changed, non-blocking) and the session
 * re-fetches /staff/me, which drops the gate into the app. No back button —
 * "Cancel and sign out" is the only way out. If Firebase wants a recent sign-in
 * (an older session), the screen asks for the current/temporary password too.
 */

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { useAppTheme } from '@/theme/theme-context';

export default function SetNewPassword() {
  const theme = useAppTheme();
  const session = useSession();
  const isStaff = session.role === 'staff';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [current, setCurrent] = useState('');
  const [needsCurrent, setNeedsCurrent] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError("Passwords don't match.");
    if (needsCurrent && !current) {
      return setError(isStaff ? 'Enter the temporary password from your owner.' : 'Enter your current password.');
    }
    setSaving(true);
    try {
      await session.setNewPassword(password, needsCurrent ? current : undefined);
      if (!isStaff) {
        Alert.alert(
          'Password updated',
          'Your backup code has been used and two-step sign-in was turned off. Set up your authenticator again and get new backup codes in Security.',
        );
      }
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/requires-recent-login') {
        setNeedsCurrent(true);
        setError(
          isStaff
            ? 'For your security, enter the temporary password your owner gave you, then try again.'
            : 'For your security, enter your current password, then try again. If you no longer know it, cancel and recover again with a backup code.',
        );
      } else {
        setError(firebaseAuthErrorMessage(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <ThemedIconTile name="key.fill" size={56} filled />
            <Text style={theme.display(30)}>Set a New Password</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              {isStaff
                ? `Welcome${session.staff?.name ? `, ${session.staff.name.split(' ')[0]}` : ''}! Replace the temporary password your owner gave you with one only you know.`
                : 'You signed in with a backup code. Choose a new password to finish recovering your account.'}
            </Text>
          </View>

          <View style={[theme.card, styles.form]}>
            {needsCurrent ? (
              <AuthField
                title={isStaff ? 'Temporary Password' : 'Current Password'}
                icon="lock.fill"
                value={current}
                onChangeText={setCurrent}
                secure
                required
                placeholder={isStaff ? 'From your owner' : 'Your current password'}
              />
            ) : null}
            <AuthField
              title="New Password"
              icon="lock.fill"
              value={password}
              onChangeText={setPassword}
              secure
              required
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <AuthField
              title="Confirm Password"
              icon="lock.fill"
              value={confirm}
              onChangeText={setConfirm}
              secure
              required
              placeholder="Type it again"
              autoComplete="new-password"
              onSubmitEditing={save}
            />
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ThemedButton title="Save Password" kind="inverse" onPress={save} loading={saving} />
          <Pressable onPress={session.signOut} hitSlop={8} style={styles.signOut}>
            <Text style={[styles.signOutText, { color: theme.secondaryText }]}>Cancel and sign out</Text>
          </Pressable>
        </KeyboardAwareForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { padding: 24, gap: 22, paddingBottom: 40 },
  head: { gap: 12, paddingTop: 32 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  form: { padding: 20, gap: 18 },
  signOut: { alignSelf: 'center', padding: 8 },
  signOutText: { fontSize: 15 },
});
