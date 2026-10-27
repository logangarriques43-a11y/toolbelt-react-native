/**
 * UserTypeCard — port of UserTypecard.swift (the role picker on the landing
 * screen). Large tappable card: themed icon tile, title, description, and a
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
import { ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

export interface UserTypeCardProps {
  icon: SFSymbol;
  title: string;
  description: string;
  /** Ignored since the redesign (tiles use the look's accent); kept so callers compile. */
  accentColor?: string;
  onPress: () => void;
}

// Matches SwiftUI `.spring(response: 0.3)`.
const SPRING = { mass: 1, damping: 15, stiffness: 220 };

export function UserTypeCard({
  icon,
  title,
  description,
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
          theme.card,
          cardStyle,
        ]}>
        <View style={styles.content}>
          <Animated.View style={iconStyle}>
            <ThemedIconTile name={icon} size={64} />
          </Animated.View>

          <Text style={theme.display(28, '500')}>{title}</Text>
          <Text style={[styles.description, { color: theme.secondaryText }]}>
            {description}
          </Text>

          <View style={styles.cta}>
            <Text style={[styles.ctaText, { color: theme.accent }]}>Get Started</Text>
            <Animated.View style={arrowStyle}>
              <Icon name="arrow.right" size={16} weight="semibold" color={theme.accent} />
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  content: { padding: 32, gap: 16, alignItems: 'flex-start' },
  description: { fontSize: 16, lineHeight: 22 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontSize: 16, fontWeight: '600' },
});
