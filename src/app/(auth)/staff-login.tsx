/**
 * Staff Sign In — port of the iOS StaffLoginView.
 *
 * For team members the owner invited from Staff → Invite to App. Email (trimmed,
 * lowercased) + password (6+) → Firebase signInWithEmailAndPassword, then the
 * session loads GET /staff/me and checks the login is complete; any problem
 * signs back out with a plain message (e.g. "isn't set up as a staff login").
 * A first sign-in with the temporary password lands on Set New Password.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { BackHeader } from '@/components/back-header';
import { ErrorBanner } from '@/components/error-banner';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { useAppTheme } from '@/theme/theme-context';

export default function StaffLogin() {
  const theme = useAppTheme();
  const router = useRouter();
  const { signInStaff } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError('');
    const id = email.trim().toLowerCase();
    if (!id.includes('@') || !id.includes('.')) return setError('Enter the email your owner set up for you.');
    if (password.length < 6) return setError('Enter your password (at least 6 characters).');
    setLoading(true);
    try {
      await signInStaff(id, password);
    } catch (e) {
      setError(
        firebaseErrorCode(e) === 'auth/multi-factor-auth-required'
          ? 'This account uses two-step sign-in. Go back and use Sign in instead.'
          : firebaseAuthErrorMessage(e),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill} edges={['top']}>
        <BackHeader label="Back" />
        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <View style={styles.head}>
            <ThemedIconTile name="person.2.fill" size={52} filled />
            <Text style={theme.display(30)}>Staff Sign In</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Use the email and temporary password your business owner gave you. You’ll choose your own
              password the first time.
            </Text>
          </View>

          <View style={[theme.card, styles.form]}>
            <AuthField
              title="Email"
              icon="envelope.fill"
              value={email}
              onChangeText={setEmail}
              required
              placeholder="you@business.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <AuthField
              title="Password"
              icon="lock.fill"
              value={password}
              onChangeText={setPassword}
              required
              secure
              placeholder="Temporary or your own password"
              autoComplete="current-password"
              onSubmitEditing={submit}
            />
            <Pressable style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
              <Text style={[styles.forgot, { color: theme.accent }]}>Forgot Password?</Text>
            </Pressable>
          </View>

          {error ? <ErrorBanner message={error} /> : null}

          <ThemedButton title="Sign In" kind="inverse" onPress={submit} loading={loading} />
          <Text style={[styles.footer, { color: theme.secondaryText }]}>
            No login yet? Ask the business owner to invite you from Staff → Invite to App.
          </Text>
        </KeyboardAwareForm>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: 24, gap: 22, paddingBottom: 40 },
  head: { gap: 12, paddingTop: 16 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  form: { padding: 20, gap: 18 },
  forgotRow: { alignSelf: 'flex-end' },
  forgot: { fontSize: 14, fontWeight: '500' },
  footer: { fontSize: 14, textAlign: 'center' },
});
