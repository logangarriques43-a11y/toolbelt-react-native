/**
 * UserTypeCard — port of UserTypecard.swift (the role picker on the landing
 * screen). Large tappable card: tinted icon tile, title, description, and a
 * "Get Started →" affordance. Press applies the same spring feedback as the
 * SwiftUI original (card scales to 0.98 / lifts, icon scales to 1.1, arrow
 * nudges right).
 */

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Radius } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface UserTypeCardProps {
  icon: SFSymbol;
  title: string;
  description: string;
  accentColor: string;
  onPress: () => void;
}

// Matches SwiftUI `.spring(response: 0.3)`.
const SPRING = { mass: 1, damping: 15, stiffness: 220 };

export function UserTypeCard({
  icon,
  title,
  description,
  accentColor,
  onPress,
}: UserTypeCardProps) {
  const theme = useAppTheme();
  const pressed = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(pressed.value ? 0.98 : 1, SPRING) },
      { translateY: withSpring(pressed.value ? -4 : 0, SPRING) },
    ],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 1.1 : 1, SPRING) }],
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(pressed.value ? 4 : 0, SPRING) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground },
          cardStyle,
        ]}>
        {/* Decorative top-trailing circle. */}
        <View
          style={[styles.decorCircle, { backgroundColor: `${accentColor}1A` }]}
          pointerEvents="none"
        />

        <View style={styles.content}>
          <Animated.View
            style={[styles.iconTile, { backgroundColor: accentColor }, iconStyle]}>
            <Icon name={icon} size={32} color="#FFFFFF" />
          </Animated.View>

          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.description, { color: theme.secondaryText }]}>
            {description}
          </Text>

          <View style={styles.cta}>
            <Text style={[styles.ctaText, { color: accentColor }]}>Get Started</Text>
            <Animated.View style={arrowStyle}>
              <Icon name="arrow.right" size={16} weight="semibold" color={accentColor} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    // SwiftUI: .shadow(color: black.opacity(0.1), radius: 10, y: 4)
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  decorCircle: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -30,
    right: -30,
  },
  content: { padding: 32, gap: 16, alignItems: 'flex-start' },
  iconTile: {
    width: 64,
    height: 64,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700' },
  description: { fontSize: 16, lineHeight: 22 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '600' },
});
