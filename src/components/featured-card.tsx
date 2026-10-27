/**
 * FeaturedCard — port of FeaturedCard.swift.
 * Fixed-size (280×160) hero card with a serif title + subtitle, used in
 * horizontally-scrolling "featured" rails. The `color` prop is accepted for
 * older call sites but ignored: the card uses the look's hero colours.
 */

import { StyleSheet, Text, View } from 'react-native';

import { DISPLAY_FONT } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface FeaturedCardProps {
  title: string;
  subtitle: string;
  color?: string;
}

export function FeaturedCard({ title, subtitle }: FeaturedCardProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.hero,
          borderRadius: theme.cornerRadius,
          borderColor: theme.divider,
        },
      ]}>
      <Text style={[styles.title, { color: theme.onHero }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.onHero }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 280, height: 160, padding: 24, justifyContent: 'flex-end', gap: 10, borderWidth: 1 },
  title: { fontFamily: DISPLAY_FONT, fontSize: 24 },
  subtitle: { fontSize: 15, opacity: 0.85 },
});
