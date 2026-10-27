/**
 * DashboardGradient — the full-screen background wrapper. The redesign has no
 * gradients, so this is a flat `background` fill; the name is kept so existing
 * screens pick up the new look.
 */

import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/theme-context';

export function DashboardGradient({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  return <View style={[styles.fill, { backgroundColor: theme.background }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
