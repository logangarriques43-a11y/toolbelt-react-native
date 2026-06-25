/**
 * CustomTextField — port of CustomTextField.swift.
 * Labeled input: caption above, leading SF Symbol, rounded card field.
 */

import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Icon } from '@/components/icon';
import { Radius } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface CustomTextFieldProps extends Omit<TextInputProps, 'style'> {
  title: string;
  icon: SFSymbol;
  value: string;
  onChangeText: (text: string) => void;
}

export function CustomTextField({
  title,
  icon,
  value,
  onChangeText,
  ...rest
}: CustomTextFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{title}</Text>

      <View
        style={[
          styles.field,
          { backgroundColor: theme.cardBackground, borderColor: theme.fieldBorder },
        ]}>
        <Icon name={icon} size={18} color={theme.secondaryText} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          placeholderTextColor={theme.tertiaryText}
          style={[styles.input, { color: theme.primaryText }]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: Radius.field,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
});
