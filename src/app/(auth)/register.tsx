/**
 * Business-owner registration — port of BusinessOwnerRegistrationView.swift.
 *
 * Faithful UI incl. live password-strength requirements and the confirm-match
 * indicator. Submit is stubbed onto the SessionProvider: the Swift flow went
 * register → email verification → login; here we sign the new owner in directly
 * (email verification + Firebase land with the auth backend later), which lands
 * the gate in the onboarding group as the real flow eventually does.
 */

import { useRouter } from 'expo-router';
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
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

import { firebaseAuthErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { withOpacity } from '@/lib/color';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,64}$/;
const SYMBOL_RE = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export default function Register() {
  const theme = useAppTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasCapital = /[A-Z]/.test(password);
  const hasNumberOrSymbol = SYMBOL_RE.test(password);
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const register = async () => {
    if (loading) return;
    setError('');
    if (!name) return setError('Please enter your name');
    if (!businessName) return setError('Please enter your business name');
    if (!email) return setError('Please enter your email');
    if (!EMAIL_RE.test(email)) return setError('Please enter a valid email address');
    if (!hasMinLength) return setError('Password must be at least 8 characters');
    if (!hasCapital) return setError('Password must contain at least one capital letter');
    if (!hasNumberOrSymbol)
      return setError('Password must contain at least one number or symbol');
    if (!passwordsMatch) return setError("Passwords don't match");

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });
      // onAuthStateChanged (SessionProvider) advances the gate. (businessName is
      // captured client-side for now; persisting it to the backend is a later PR.)
    } catch (e) {
      setError(firebaseAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackHeader label="Back" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <TitleBadge icon="building.2.fill" />
            <Text style={[styles.h1, { color: theme.primaryText }]}>Create Your Account</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Start managing your business today
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.cardBackground }]}>
            <AuthField
              title="Full Name"
              icon="person.fill"
              value={name}
              onChangeText={setName}
              required
              placeholder="Enter your name"
              autoCapitalize="words"
            />
            <AuthField
              title="Business Name"
              icon="building.2.fill"
              value={businessName}
              onChangeText={setBusinessName}
              required
              placeholder="Enter your business name"
              autoCapitalize="words"
            />
            <AuthField
              title="Phone Number"
              icon="phone.fill"
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
            <AuthField
              title="Email"
              icon="envelope.fill"
              value={email}
              onChangeText={setEmail}
              required
              placeholder="Enter your email"
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
              placeholder="Create a password"
              footer={
                password ? (
                  <View style={styles.requirements}>
                    <Requirement text="At least 8 characters" met={hasMinLength} />
                    <Requirement text="One capital letter" met={hasCapital} />
                    <Requirement text="One number or symbol" met={hasNumberOrSymbol} />
                  </View>
                ) : null
              }
            />
            <AuthField
              title="Confirm Password"
              icon="lock.fill"
              value={confirm}
              onChangeText={setConfirm}
              required
              secure
              placeholder="Confirm your password"
              borderColor={passwordsMatch ? withOpacity(iOSColors.green, 0.5) : undefined}
              footer={
                confirm ? (
                  <View style={styles.matchRow}>
                    <Icon
                      name={passwordsMatch ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
                      size={12}
                      color={passwordsMatch ? iOSColors.green : iOSColors.red}
                    />
                    <Text
                      style={[
                        styles.matchText,
                        { color: passwordsMatch ? iOSColors.green : iOSColors.red },
                      ]}>
                      {passwordsMatch ? 'Passwords match' : "Passwords don't match"}
                    </Text>
                  </View>
                ) : null
              }
            />
          </View>

          {error ? (
            <View style={styles.section}>
              <ErrorBanner message={error} />
            </View>
          ) : null}

          <View style={styles.section}>
            <GradientButton title={loading ? 'Creating…' : 'Create Account'} onPress={register} />
          </View>

          <View style={styles.bottomRow}>
            <Text style={[styles.bottomText, { color: theme.secondaryText }]}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={[styles.bottomLink, { color: Brand.accent }]}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Requirement({ text, met }: { text: string; met: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.requirementRow}>
      <Icon
        name={met ? 'checkmark.circle.fill' : 'circle'}
        size={12}
        color={met ? iOSColors.green : withOpacity(iOSColors.gray, 0.5)}
      />
      <Text style={[styles.requirementText, { color: met ? iOSColors.green : theme.secondaryText }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { gap: 32, paddingBottom: 40 },
  titleBlock: { gap: 12, alignItems: 'center', paddingTop: 10 },
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
  requirements: { gap: 6, paddingTop: 4 },
  requirementRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requirementText: { fontSize: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  matchText: { fontSize: 12 },
  section: { paddingHorizontal: 20 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomText: { fontSize: 15 },
  bottomLink: { fontSize: 15, fontWeight: '600' },
});
