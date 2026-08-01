/**
 * DashboardStatCard — port of DashboardStatCard.swift.
 * Tappable stat tile: top-aligned tinted icon, then title + bold value.
 */

import type { SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Radius, cardShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface DashboardStatCardProps {
  icon: SFSymbol;
  title: string;
  value: string;
  color: string;
  onPress?: () => void;
}

export function DashboardStatCard({
  icon,
  title,
  value,
  color,
  onPress,
}: DashboardStatCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.cardBackground },
        cardShadow(theme),
        pressed && onPress ? styles.pressed : null,
      ]}>
      <View style={styles.iconRow}>
        <Icon name={icon} size={28} color={color} />
      </View>

      <View style={styles.textBlock}>
        <Text allowFontScaling={false} style={[styles.title, { color: theme.secondaryText }]}>{title}</Text>
        <Text allowFontScaling={false} numberOfLines={1} style={[styles.value, { color: theme.primaryText }]}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    // minHeight (not a fixed height) so the card grows to fit its title on
    // Android, where text renders wider and a long title ("Book Appointments",
    // "Vendor Marketplace") would otherwise overflow the box and overlap the
    // row below. Cards in a row stretch to the tallest, so they stay aligned.
    minHeight: 130,
    padding: 20,
    borderRadius: Radius.card,
    justifyContent: 'space-between',
    gap: 12,
  },
  iconRow: { flexDirection: 'row' },
  textBlock: { gap: 4 },
  title: { fontSize: 14 },
  value: { fontSize: 18, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
