/**
 * TitleBadge — the 80×80 brand-gradient circle with a centered white icon that
 * heads the Login and Register screens.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Brand } from '@/theme/tokens';

export function TitleBadge({ icon }: { icon: SFSymbol }) {
  return (
    <LinearGradient
      colors={Brand.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.circle}>
      <Icon name={icon} size={32} color="#FFFFFF" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  circle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
});
