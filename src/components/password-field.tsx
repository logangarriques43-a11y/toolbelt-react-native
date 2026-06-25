/**
 * PasswordField — port of PasswordField.swift.
 * Labeled secure input with a leading icon and a show/hide eye toggle.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Icon } from '@/components/icon';
import { Radius } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface PasswordFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  title: string;
  icon: SFSymbol;
  value: string;
  onChangeText: (text: string) => void;
}

export function PasswordField({
  title,
  icon,
  value,
  onChangeText,
  ...rest
}: PasswordFieldProps) {
  const theme = useAppTheme();
  const [showPassword, setShowPassword] = useState(false);

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
          secureTextEntry={!showPassword}
          autoCorrect={false}
          autoCapitalize="none"
          placeholderTextColor={theme.tertiaryText}
          style={[styles.input, { color: theme.primaryText }]}
          {...rest}
        />
        <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
          <Icon
            name={showPassword ? 'eye.slash.fill' : 'eye.fill'}
            size={18}
            color={theme.secondaryText}
          />
        </Pressable>
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
