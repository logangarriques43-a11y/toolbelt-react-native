/**
 * Fab — the floating "+" button anchored bottom-right on the Services /
 * Clients list screens. Flat accent circle with an `onAccent` glyph.
 */

import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

export function Fab({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();
  // Lift above the Android on-screen nav/gesture bar.
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Add"
      style={({ pressed }) => [
        styles.circle,
        {
          bottom: insets.bottom + 24,
          backgroundColor: theme.accent,
          borderRadius: theme.isEditorial ? 2 : 30,
        },
        pressed ? styles.pressed : null,
      ]}>
      <Icon name="plus" size={24} weight="bold" color={theme.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    right: 24,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85 },
});
