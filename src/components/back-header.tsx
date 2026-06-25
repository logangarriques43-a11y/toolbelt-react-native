/**
 * BackHeader — the top-left back affordance used on auth screens.
 * With `label` it shows "‹ Back" in the brand accent (Login/Register); without,
 * a lone chevron in secondary text (ForgotPassword).
 */

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Brand } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface BackHeaderProps {
  label?: string;
  tint?: string;
  onPress?: () => void;
}

export function BackHeader({ label, tint, onPress }: BackHeaderProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const color = tint ?? (label ? Brand.accent : theme.secondaryText);
  const handlePress = onPress ?? (() => router.back());

  return (
    <View style={styles.row}>
      <Pressable onPress={handlePress} hitSlop={8} style={styles.button}>
        <Icon name="chevron.left" size={label ? 16 : 20} weight="semibold" color={color} />
        {label ? <Text style={[styles.label, { color }]}>{label}</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 16, fontWeight: '600' },
});
