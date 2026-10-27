/**
 * TitleBadge — the hero icon heading the Login and Register screens: a 64pt
 * filled themed tile (accent fill, onAccent glyph).
 */

import type { SFSymbol } from 'expo-symbols';

import { ThemedIconTile } from '@/components/themed';

export function TitleBadge({ icon }: { icon: SFSymbol }) {
  return <ThemedIconTile name={icon} size={64} filled />;
}
