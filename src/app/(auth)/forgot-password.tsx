/**
 * Forgot Password — port of ForgotPasswordView.swift.
 * Collects name + email/phone and shows a generic confirmation (no account
 * enumeration). Uses the dashboard-style CustomTextField, as the Swift screen
 * did. Real reset-email dispatch is deferred to the auth backend.
 */

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader } from '@/components/back-header';
import { CustomTextField } from '@/components/custom-text-field';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function ForgotPassword() {
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');

  const resetPassword = () => {
    if (!name || !identifier) {
      setMessage('Please fill in all fields');
      return;
    }
    setMessage(
      'If an account exists with these details, a password reset link has been sent.',
    );
  };

  const isError = message === 'Please fill in all fields';

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <BackHeader />
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Icon name="key.fill" size={80} color={theme.secondaryText} />
            <Text style={[styles.h1, { color: theme.primaryText }]}>Forgot Password</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Enter your details to recover your account
            </Text>
          </View>

          <View style={styles.form}>
            <CustomTextField
              title="Name"
              icon="person.fill"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <CustomTextField
              title="Email or Phone Number"
              icon="envelope.fill"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
            />

            {message ? (
              <Text
                style={[
                  styles.message,
                  { color: isError ? iOSColors.red : iOSColors.green },
                ]}>
                {message}
              </Text>
            ) : null}

            <Text onPress={resetPassword} style={styles.button}>
              Reset Password
            </Text>
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
  h1: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  form: { gap: 20, paddingHorizontal: 20 },
  message: { fontSize: 14, textAlign: 'center' },
  button: {
    marginTop: 10,
    backgroundColor: iOSColors.gray,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
