/**
 * DashboardGradient — the standard top-leading → bottom-trailing background
 * gradient used across ToolBelt screens (`AppTheme.dashboardGradient`).
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/theme-context';

export function DashboardGradient({
  children,
  style,
}: {
  children?: ReactNode;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  return (
    <LinearGradient
      colors={theme.dashboardGradient}
      // SwiftUI: startPoint .topLeading, endPoint .bottomTrailing
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
