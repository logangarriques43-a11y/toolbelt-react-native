/**
 * TotpCodeSheet — "Enter your authenticator code" step for a Firebase MFA
 * challenge (sign-in, or re-confirming identity before a security change).
 * The caller resolves the challenge in `onSubmit`; errors thrown there are
 * shown inline. An optional footer (e.g. "Use a backup code") sits below.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CodeField } from '@/components/auth/code-field';
import { FormSheet } from '@/components/auth/form-sheet';
import { ErrorBanner } from '@/components/error-banner';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { firebaseAuthErrorMessage } from '@/lib/auth-errors';
import { useAppTheme } from '@/theme/theme-context';

export function TotpCodeSheet({
  visible,
  onClose,
  onSubmit,
  title = 'Two-Step Sign-In',
  message = 'Open your authenticator app and enter the 6-digit code for ToolBelt.',
  footer,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (code: string) => Promise<void>;
  title?: string;
  message?: string;
  footer?: ReactNode;
}) {
  const theme = useAppTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setCode('');
      setError('');
    }
  }, [visible]);

  const submit = async () => {
    if (busy) return;
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app.');
    setBusy(true);
    setError('');
    try {
      await onSubmit(code);
    } catch (e) {
      setError(firebaseAuthErrorMessage(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.head}>
        <ThemedIconTile name="lock.shield.fill" size={56} filled />
        <Text style={[styles.message, { color: theme.secondaryText }]}>{message}</Text>
      </View>
      <CodeField value={code} onChangeText={setCode} onSubmit={submit} />
      {error ? <ErrorBanner message={error} /> : null}
      <ThemedButton title="Verify" onPress={submit} loading={busy} disabled={code.length !== 6} />
      {footer}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 14, paddingTop: 8 },
  message: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
});
