/**
 * Login screen — port of LoginView.swift.
 *
 * UI is faithful; the submit path is stubbed onto the SessionProvider (real
 * Firebase email/password + passkey auth is deferred to the auth-backend phase).
 * The passkey / Apple / Google buttons render but are inert for now, matching
 * the Swift source where Apple/Google were also unimplemented.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthField } from '@/components/auth-field';
import { BackHeader } from '@/components/back-header';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { ErrorBanner } from '@/components/error-banner';
import { GradientButton } from '@/components/gradient-button';
import { Icon } from '@/components/icon';
import { TitleBadge } from '@/components/title-badge';
import { useSession } from '@/context/session';
import { displayNameFromEmail } from '@/lib/name';
import { withOpacity } from '@/lib/color';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export default function Login() {
  const theme = useAppTheme();
  const router = useRouter();
  const { signIn } = useSession();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const login = () => {
    setError('');
    const id = identifier.trim();
    if (!id) return setError('Please enter your email or phone number');
    if (id.includes('@') && !EMAIL_RE.test(id))
      return setError('Please enter a valid email address');
    if (!password) return setError('Please enter your password');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    // Stub: real Firebase sign-in is deferred. Mirror the account-resolution end
    // state (sign in as a business owner) so the gate advances.
    const name = id.includes('@') ? displayNameFromEmail(id) : 'Business Owner';
    signIn({ name, email: id.includes('@') ? id : undefined, isBusinessOwner: true });
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackHeader label="Back" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <TitleBadge icon="person.fill" />
            <Text style={[styles.h1, { color: theme.primaryText }]}>Welcome Back</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Sign in to continue managing your business
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
            <AuthField
              title="Email or Phone"
              icon="person.fill"
              value={identifier}
              onChangeText={setIdentifier}
              required
              placeholder="Enter email or phone number"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthField
              title="Password"
              icon="lock.fill"
              value={password}
              onChangeText={setPassword}
              required
              secure
              placeholder="Enter your password"
            />
            <Pressable style={styles.forgotRow} onPress={() => router.push('/forgot-password')}>
              <Text style={[styles.forgot, { color: Brand.accent }]}>Forgot Password?</Text>
            </Pressable>
          </View>

          {error ? (
            <View style={styles.section}>
              <ErrorBanner message={error} />
            </View>
          ) : null}

          <View style={styles.section}>
            <GradientButton title="Sign In" onPress={login} />
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.line, { backgroundColor: withOpacity(iOSColors.gray, 0.3) }]} />
            <Text style={[styles.or, { color: theme.secondaryText }]}>or</Text>
            <View style={[styles.line, { backgroundColor: withOpacity(iOSColors.gray, 0.3) }]} />
          </View>

          <View style={styles.altButtons}>
            <OutlineButton icon="person.badge.key.fill" title="Sign in with Passkey" accent />
            <OutlineButton icon="apple.logo" title="Continue with Apple" />
            <OutlineButton icon="g.circle.fill" title="Continue with Google" />
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.bottomText, { color: theme.secondaryText }]}>
              Don&apos;t have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={[styles.bottomLink, { color: Brand.accent }]}>Create Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function OutlineButton({
  icon,
  title,
  accent = false,
}: {
  icon: SFSymbol;
  title: string;
  accent?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={[
        styles.outline,
        {
          backgroundColor: theme.cardBackground,
          borderColor: accent ? withOpacity(Brand.accent, 0.4) : withOpacity(iOSColors.gray, 0.3),
          borderWidth: accent ? 1.5 : 1,
        },
      ]}>
      <Icon name={icon} size={18} color={theme.primaryText} />
      <Text style={[styles.outlineText, { color: theme.primaryText }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 32, paddingBottom: 40 },
  titleBlock: { gap: 12, alignItems: 'center', paddingTop: 40 },
  h1: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  formCard: {
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 20,
    gap: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
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
    borderRadius: 12,
  },
  outlineText: { fontSize: 16, fontWeight: '500' },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontSize: 15 },
  bottomLink: { fontSize: 15, fontWeight: '600' },
});
