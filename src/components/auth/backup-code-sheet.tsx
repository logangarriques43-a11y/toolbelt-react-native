/**
 * BackupCodeSheet — account recovery from the login screen when the
 * authenticator (or password) is lost. Email + one backup code →
 * POST /auth/recovery/backup-code → Firebase custom token. The server burns the
 * code, clears the enrolled second factor and asks for a new password, so the
 * session opens on the Set New Password screen.
 */

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { redeemBackupCode } from '@/api/auth-recovery';
import { FormSheet } from '@/components/auth/form-sheet';
import { AuthField } from '@/components/auth-field';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { firebaseAuthErrorMessage } from '@/lib/auth-errors';
import { useAppTheme } from '@/theme/theme-context';

export function BackupCodeSheet({
  visible,
  initialEmail = '',
  onClose,
}: {
  visible: boolean;
  initialEmail?: string;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { signInWithToken } = useSession();
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setEmail(initialEmail);
      setCode('');
      setError('');
    }
  }, [visible, initialEmail]);

  const submit = async () => {
    if (busy) return;
    if (!email.trim().includes('@')) return setError('Enter the email address for your account.');
    if (code.trim().length < 8) return setError('Enter one of your backup codes, e.g. abcde-fghij-klmno-pqrst-uvwxy.');
    setBusy(true);
    setError('');
    try {
      const result = await redeemBackupCode(email, code);
      await signInWithToken(result.customToken, { mustResetPassword: result.mustResetPassword !== false });
      onClose();
    } catch (e) {
      setError(firebaseAuthErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet visible={visible} title="Use a Backup Code" onClose={onClose}>
      <View style={styles.head}>
        <ThemedIconTile name="key.fill" size={56} filled />
        <Text style={[styles.message, { color: theme.secondaryText }]}>
          Lost your authenticator? Enter your email and one of the backup codes you saved when you set up
          two-step sign-in. Each code works once.
        </Text>
      </View>
      <AuthField
        title="Email"
        icon="envelope.fill"
        value={email}
        onChangeText={setEmail}
        placeholder="you@business.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <AuthField
        title="Backup Code"
        icon="key.fill"
        value={code}
        onChangeText={setCode}
        placeholder="abcde-fghij-klmno-pqrst-uvwxy"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorBanner message={error} /> : null}
      <ThemedButton title="Recover Account" onPress={submit} loading={busy} />
      <Text style={[styles.note, { color: theme.tertiaryText }]}>
        Recovering turns off two-step sign-in and asks you to choose a new password. Set up your
        authenticator again afterwards in Security.
      </Text>
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 14, paddingTop: 8 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  note: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
