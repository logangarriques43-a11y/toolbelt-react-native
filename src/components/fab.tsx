/**
 * Fab — the floating blue→purple "+" button anchored bottom-right on the
 * Services / Clients list screens.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';

export function Fab({
  onPress,
  colors = [iOSColors.blue, iOSColors.purple],
  shadowColor = iOSColors.blue,
}: {
  onPress: () => void;
  colors?: readonly [string, string, ...string[]];
  shadowColor?: string;
}) {
  // Lift above the Android on-screen nav/gesture bar.
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, { bottom: insets.bottom + 24, shadowColor }, pressed ? styles.pressed : null]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
        <Icon name="plus" size={24} weight="bold" color="#FFFFFF" />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    // SwiftUI: .shadow(color: blue.opacity(0.3), radius: 10, y: 5)
    shadowColor: iOSColors.blue,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  circle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9 },
});
