/**
 * AuthField — the labeled input style used across the auth screens (Login,
 * Register). Distinct from the dashboard `CustomTextField`: label sits in
 * primaryText with a red required asterisk, radius 12, divider border, and an
 * optional show/hide eye toggle for secure entry.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface AuthFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  title: string;
  icon: SFSymbol;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  secure?: boolean;
  /** Override the field border (e.g. green when passwords match). */
  borderColor?: string;
  /** Validation hint(s) rendered below the field, inside the label group. */
  footer?: ReactNode;
}

export function AuthField({
  title,
  icon,
  value,
  onChangeText,
  required = false,
  secure = false,
  borderColor,
  footer,
  ...rest
}: AuthFieldProps) {
  const theme = useAppTheme();
  const [show, setShow] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.primaryText }]}>{title}</Text>
        {required ? <Text style={styles.required}>*</Text> : null}
      </View>

      <View
        style={[
          styles.field,
          {
            backgroundColor: theme.cardBackground,
            borderColor: borderColor ?? theme.divider,
          },
        ]}>
        <Icon name={icon} size={16} color={theme.secondaryText} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !show}
          placeholderTextColor={theme.tertiaryText}
          style={[styles.input, { color: theme.primaryText }]}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Icon
              name={show ? 'eye.slash.fill' : 'eye.fill'}
              size={16}
              color={theme.secondaryText}
            />
          </Pressable>
        ) : null}
      </View>

      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  labelRow: { flexDirection: 'row', gap: 4 },
  label: { fontSize: 14, fontWeight: '500' },
  required: { fontSize: 14, fontWeight: '500', color: iOSColors.red },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
});
