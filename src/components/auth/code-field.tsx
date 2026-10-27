/**
 * CodeField — the single 6-digit input for authenticator (TOTP) codes. Digits
 * only, wide tracking, one-time-code autofill hints so the keyboard can offer
 * the code where the platform supports it.
 */

import { StyleSheet, TextInput } from 'react-native';

import { useAppTheme } from '@/theme/theme-context';

export function CodeField({
  value,
  onChangeText,
  onSubmit,
  autoFocus = true,
}: {
  value: string;
  onChangeText: (code: string) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <TextInput
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, 6))}
      onSubmitEditing={onSubmit}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus={autoFocus}
      placeholder="000000"
      placeholderTextColor={theme.tertiaryText}
      accessibilityLabel="6-digit code"
      style={[
        styles.input,
        {
          color: theme.primaryText,
          backgroundColor: theme.cardBackground,
          borderColor: theme.divider,
          borderRadius: theme.isEditorial ? 2 : 12,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 30,
    letterSpacing: 10,
    textAlign: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    fontVariant: ['tabular-nums'],
  },
});
