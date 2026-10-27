/**
 * Themed building blocks for the redesign — RN ports of ThemedComponents.swift.
 *
 * - ThemedIconTile: every row/card icon sits in a rounded square, accentSoft
 *   fill with an accent glyph. `filled` is for the one hero icon on a screen.
 * - ThemedButton: inverse (highest emphasis), accent, or quiet outline.
 *   Capsules everywhere except Editorial (square, uppercase, tracked).
 * - LivePill: Live / Set up status pill (dot + uppercase text in Editorial).
 * - ThemedSectionHeader: serif section title; uppercase with a rule in Editorial.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type SFSymbol } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

export function ThemedIconTile({
  name,
  size = 36,
  filled = false,
  style,
}: {
  name: SFSymbol;
  size?: number;
  filled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.isEditorial ? 2 : size * 0.3,
          backgroundColor: filled ? theme.accent : theme.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Icon name={name} size={Math.round(size * 0.44)} color={filled ? theme.onAccent : theme.accent} />
    </View>
  );
}

export type ThemedButtonKind = 'inverse' | 'accent' | 'quiet';

export function ThemedButton({
  title,
  onPress,
  kind = 'accent',
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: ThemedButtonKind;
  icon?: SFSymbol;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const theme = useAppTheme();
  const fill = kind === 'inverse' ? theme.inverse : kind === 'accent' ? theme.accent : 'transparent';
  const fg = kind === 'inverse' ? theme.onInverse : kind === 'accent' ? theme.onAccent : theme.primaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          borderRadius: theme.isEditorial ? 2 : 999,
          borderWidth: kind === 'quiet' ? 1 : 0,
          borderColor: theme.divider,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <Text
            style={[
              styles.buttonText,
              { color: fg },
              theme.isEditorial ? styles.editorialLabel : null,
            ]}>
            {theme.isEditorial ? title.toUpperCase() : title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function LivePill({ live, liveLabel = 'Live', offLabel = 'Set up' }: { live: boolean; liveLabel?: string; offLabel?: string }) {
  const theme = useAppTheme();
  const color = live ? theme.live : theme.secondaryText;
  const label = live ? liveLabel : offLabel;
  if (theme.isEditorial) {
    return (
      <View style={styles.pillRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.pillText, styles.editorialLabel, { color }]}>{label.toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, styles.pillRow, { backgroundColor: live ? theme.liveSoft : theme.inputBackground }]}>
      {live ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function ThemedSectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  const theme = useAppTheme();
  if (theme.isEditorial) {
    return (
      <View style={styles.editorialHeader}>
        <View style={styles.headerRow}>
          <Text style={[styles.editorialTitle, { color: theme.primaryText }]}>{title.toUpperCase()}</Text>
          {right}
        </View>
        <View style={[styles.rule, { backgroundColor: theme.primaryText }]} />
      </View>
    );
  }
  return (
    <View style={styles.headerRow}>
      <Text style={theme.display(22)}>{title}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  editorialLabel: { letterSpacing: 1.4, fontSize: 13 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: '600' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorialHeader: { gap: 6 },
  editorialTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
  rule: { height: 1 },
});
