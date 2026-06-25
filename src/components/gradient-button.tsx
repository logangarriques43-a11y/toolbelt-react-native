/**
 * GradientButton — the primary brand CTA (blue→purple) used on the auth
 * screens. Shows a trailing arrow, or a spinner while loading.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Icon } from '@/components/icon';
import { Brand } from '@/theme/tokens';

export interface GradientButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Trailing icon; defaults to the forward arrow. */
  icon?: SFSymbol;
}

export function GradientButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon = 'arrow.right',
}: GradientButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => (pressed ? styles.pressed : null)}>
      <LinearGradient
        colors={Brand.gradient}
        // SwiftUI: leading → trailing
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.row}>
            <Text style={styles.title}>{title}</Text>
            <Icon name={icon} size={16} weight="semibold" color="#FFFFFF" />
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    // SwiftUI: .shadow(color: accent.opacity(0.4), radius: 12, y: 6)
    shadowColor: Brand.accent,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  pressed: { opacity: 0.9 },
});
