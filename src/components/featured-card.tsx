/**
 * FeaturedCard — port of FeaturedCard.swift.
 * Fixed-size (280×160) gradient card with a bold title + subtitle, used in
 * horizontally-scrolling "featured" rails.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { withOpacity } from '@/lib/color';
import { Radius } from '@/theme/tokens';

export interface FeaturedCardProps {
  title: string;
  subtitle: string;
  /** Base color; the card fills with [color, color@0.7] top-left → bottom-right. */
  color: string;
}

export function FeaturedCard({ title, subtitle, color }: FeaturedCardProps) {
  return (
    <View style={[styles.shadowWrap, { shadowColor: color }]}>
      <LinearGradient
        colors={[color, withOpacity(color, 0.7)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // SwiftUI: .shadow(color: color.opacity(0.3), radius: 15, x: 0, y: 8)
  shadowWrap: {
    width: 280,
    height: 160,
    borderRadius: Radius.featured,
    shadowOpacity: 0.3,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  card: {
    flex: 1,
    borderRadius: Radius.featured,
    padding: 24,
    justifyContent: 'flex-end',
  },
  content: { gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)' },
});
