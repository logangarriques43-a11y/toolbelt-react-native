/**
 * Login screen — port of LoginView.swift.
 *
 * Email + password through the session (Firebase signInWithEmailAndPassword).
 * The session checks the token's role claim, so a staff login typed here is
 * handed to the staff session automatically.
 *
 * - Two-step sign-in: `auth/multi-factor-auth-required` opens the authenticator
 *   code sheet, which resolves the Firebase MFA challenge.
 * - "Use a backup code" recovers an account whose authenticator is lost
 *   (POST /auth/recovery/backup-code → custom token).
 * - "Sign in with Passkey": WebAuthn via react-native-passkey; the email field,
 *   when filled, narrows the request to that account's passkeys.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { getMultiFactorResolver, type MultiFactorError, type MultiFactorResolver } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isPasskeyCancel, passkeyErrorMessage, passkeySignIn, passkeysSupported } from '@/api/webauthn';
import { BackupCodeSheet } from '@/components/auth/backup-code-sheet';
import { TotpCodeSheet } from '@/components/auth/totp-code-sheet';
import { AuthField } from '@/components/auth-field';
import { BackHeader } from '@/components/back-header';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { ErrorBanner } from '@/components/error-banner';
import { GradientButton } from '@/components/gradient-button';
import { Icon } from '@/components/icon';
import { TitleBadge } from '@/components/title-badge';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function Login() {
  const theme = useAppTheme();
  const router = useRouter();
  const session = useSession();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [resolver, setResolver] = useState<MultiFactorResolver | null>(null);
  const [showBackup, setShowBackup] = useState(false);

  const login = async () => {
    if (loading) return;
    setError('');
    const id = identifier.trim();
    if (!id) return setError('Please enter your email');
    if (!EMAIL_RE.test(id)) return setError('Please enter a valid email address');
    if (!password) return setError('Please enter your password');

    setLoading(true);
    try {
      await session.signInWithEmail(id, password);
    } catch (e) {
      if (firebaseErrorCode(e) === 'auth/multi-factor-auth-required') {
        setResolver(getMultiFactorResolver(auth, e as MultiFactorError));
      } else {
        setError(firebaseAuthErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithPasskey = async () => {
    if (passkeyLoading) return;
    setError('');
    if (!passkeysSupported()) return setError('This device doesn’t support passkeys.');
    setPasskeyLoading(true);
    try {
      const token = await passkeySignIn(EMAIL_RE.test(identifier.trim()) ? identifier : undefined);
      await session.signInWithToken(token);
    } catch (e) {
      if (!isPasskeyCancel(e)) {
        const code = firebaseErrorCode(e);
        setError(code.startsWith('auth/') ? firebaseAuthErrorMessage(e) : passkeyErrorMessage(e));
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackHeader label="Back" />
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.titleBlock}>
            <TitleBadge icon="person.fill" />
            <Text style={theme.display(28, '500')}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Sign in to continue managing your business
            </Text>
          </View>

          <View style={[styles.formCard, theme.card]}>
            <AuthField
              title="Email"
              icon="envelope.fill"
              value={identifier}
              onChangeText={setIdentifier}
              required
              placeholder="Enter your email"
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
              placeholder="Enter your password"
              autoComplete="current-password"
              onSubmitEditing={login}
            />
            <Pressable style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
              <Text style={[styles.forgot, { color: theme.accent }]}>Forgot Password?</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.section}>
              <ErrorBanner message={error} />
            </View>
          ) : null}

          <View style={styles.section}>
            <GradientButton title={loading ? 'Signing In…' : 'Sign In'} onPress={login} />
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: theme.divider }]} />
            <Text style={[styles.or, { color: theme.secondaryText }]}>or</Text>
            <View style={[styles.line, { backgroundColor: theme.divider }]} />
          </View>

          <View style={styles.altButtons}>
            <OutlineButton
              icon="person.badge.key.fill"
              title="Sign in with Passkey"
              accent
              loading={passkeyLoading}
              onPress={signInWithPasskey}
            />
            <OutlineButton icon="key.fill" title="Use a Backup Code" onPress={() => setShowBackup(true)} />
            <OutlineButton
              icon="person.2.fill"
              title="Staff Sign In"
              onPress={() => router.push('/staff-login')}
            />
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.bottomText, { color: theme.secondaryText }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={[styles.bottomLink, { color: theme.accent }]}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <TotpCodeSheet
        visible={!!resolver}
        onClose={() => setResolver(null)}
        onSubmit={async (code) => {
          if (!resolver) return;
          await session.resolveTwoFactor(resolver, code);
          setResolver(null);
        }}
        footer={
          <Pressable
            style={styles.backupLink}
            onPress={() => {
              setResolver(null);
              setShowBackup(true);
            }}>
            <Text style={[styles.forgot, { color: theme.accent }]}>Lost your authenticator? Use a backup code</Text>
          </Pressable>
        }
      />
      <BackupCodeSheet visible={showBackup} initialEmail={identifier.trim()} onClose={() => setShowBackup(false)} />
    </DashboardGradient>
  );
}

function OutlineButton({
  icon,
  title,
  accent = false,
  loading = false,
  onPress,
}: {
  icon: SFSymbol;
  title: string;
  accent?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.outline,
        {
          backgroundColor: 'transparent',
          borderColor: theme.divider,
          borderWidth: 1,
          borderRadius: theme.isEditorial ? 2 : 999,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Icon name={icon} size={18} color={accent ? theme.accent : theme.primaryText} />
      )}
      <Text style={[styles.outlineText, { color: theme.primaryText }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 32, paddingBottom: 40 },
  titleBlock: { gap: 12, alignItems: 'center', paddingTop: 40 },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  formCard: {
    marginHorizontal: 20,
    padding: 24,
    gap: 20,
  },
  forgotRow: { alignSelf: 'flex-end' },
  forgot: { fontSize: 14, fontWeight: '500' },
  section: { paddingHorizontal: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 40 },
  line: { flex: 1, height: 1 },
  or: { fontSize: 14 },
  altButtons: { gap: 12, paddingHorizontal: 20 },
  outline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  outlineText: { fontSize: 16, fontWeight: '500' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontSize: 15 },
  bottomLink: { fontSize: 15, fontWeight: '600' },
  backupLink: { alignSelf: 'center', padding: 8 },
});
