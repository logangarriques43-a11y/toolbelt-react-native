/**
 * Forgot Password — port of ForgotPasswordView.swift.
 * Sends Firebase's password-reset email (sendPasswordResetEmail) and always
 * shows the same confirmation, so the screen can't be used to discover which
 * emails have accounts. Works for owners and staff logins alike.
 */

import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { CustomTextField } from '@/components/custom-text-field';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { GradientButton } from '@/components/gradient-button';
import { TitleBadge } from '@/components/title-badge';
import { firebaseAuthErrorMessage, firebaseErrorCode } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const SENT = 'If an account exists for this email, a password reset link is on its way. Check your inbox.';

export default function ForgotPassword() {
  const theme = useAppTheme();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [sending, setSending] = useState(false);

  const resetPassword = async () => {
    if (sending) return;
    const id = email.trim().toLowerCase();
    if (!EMAIL_RE.test(id)) {
      setIsError(true);
      setMessage('Please enter a valid email address');
      return;
    }
    setSending(true);
    try {
      await sendPasswordResetEmail(auth, id);
      setIsError(false);
      setMessage(SENT);
    } catch (e) {
      // Unknown accounts get the same answer as known ones.
      if (firebaseErrorCode(e) === 'auth/user-not-found') {
        setIsError(false);
        setMessage(SENT);
      } else {
        setIsError(true);
        setMessage(firebaseAuthErrorMessage(e));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackHeader />
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <TitleBadge icon="key.fill" />
            <Text style={theme.display(32, '500')}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Enter your account email and we’ll send you a link to choose a new password
            </Text>
          </View>

          <View style={styles.form}>
            <CustomTextField
              title="Email"
              icon="envelope.fill"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {message ? (
              <Text style={[styles.message, { color: isError ? iOSColors.red : iOSColors.green }]}>
                {message}
              </Text>
            ) : null}

            <View style={styles.button}>
              <GradientButton title={sending ? 'Sending…' : 'Send Reset Link'} onPress={resetPassword} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', gap: 24, paddingBottom: 40 },
  titleBlock: { gap: 16, alignItems: 'center' },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  form: { gap: 20, paddingHorizontal: 20 },
  message: { fontSize: 14, textAlign: 'center' },
  button: { marginTop: 10 },
});
