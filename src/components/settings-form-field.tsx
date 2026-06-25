/**
 * SettingsFormField — labeled input used by the Settings forms (Business Info,
 * Edit Profile, etc.). Port of the shared SettingsFormField in
 * BusinessNameInfoView.swift: uppercase caption, filled input, optional error.
 */

import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function SettingsFormField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'words';
  error?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.tertiaryText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={[
          styles.input,
          { backgroundColor: theme.inputBackground, color: theme.primaryText },
          error ? styles.inputError : null,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  inputError: { borderWidth: 1.5, borderColor: 'rgba(255,59,48,0.6)' },
  error: { fontSize: 12, color: iOSColors.red },
});
