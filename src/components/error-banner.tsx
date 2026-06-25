/**
 * ErrorBanner — the red inline validation banner shown on the auth forms.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={[styles.banner, { backgroundColor: withOpacity(iOSColors.red, 0.1) }]}>
      <Icon name="exclamationmark.triangle.fill" size={16} color={iOSColors.red} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 12,
  },
  text: { flex: 1, fontSize: 14, color: iOSColors.red },
});
