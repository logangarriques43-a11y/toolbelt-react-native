/**
 * FloatingActionMenu — expandable FAB on the schedule. Port of
 * FloatingActionMenu.swift. Tapping the + reveals Appointment / Time Off /
 * Invoice actions and rotates the button to an ×.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

const SPRING = { mass: 1, damping: 15, stiffness: 220 };

export function FloatingActionMenu({
  onCreateAppointment,
  onTimeOff,
  onInvoice,
}: {
  onCreateAppointment: () => void;
  onTimeOff: () => void;
  onInvoice: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  // Holds the icon's rotation IN DEGREES. Spring the shared value itself, then
  // format the rotate string from the resolved NUMBER — interpolating the
  // withSpring() animation object into a template literal yields the string
  // "[object Object]deg", which crashes Android's transform parser
  // (convertToRadians → parseDouble). iOS silently ignored it.
  const rot = useSharedValue(0);

  const toggle = () => {
    const next = !open;
    rot.value = withSpring(next ? 45 : 0, SPRING);
    setOpen(next);
  };
  const pick = (fn: () => void) => {
    rot.value = withSpring(0, SPRING);
    setOpen(false);
    fn();
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 24 }]} pointerEvents="box-none">
      {open ? (
        <View style={styles.menu}>
          <CompactButton icon="calendar.badge.plus" title="Appointment" onPress={() => pick(onCreateAppointment)} />
          <CompactButton icon="clock.badge.xmark" title="Time Off" onPress={() => pick(onTimeOff)} />
          <CompactButton icon="doc.text.fill" title="Invoice" onPress={() => pick(onInvoice)} />
        </View>
      ) : null}

      <Pressable onPress={toggle}>
        <View style={[styles.fab, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 30 }]}>
          <Animated.View style={iconStyle}>
            <Icon name={open ? 'xmark' : 'plus'} size={24} weight="bold" color={theme.onAccent} />
          </Animated.View>
        </View>
      </Pressable>
    </View>
  );
}

function CompactButton({ icon, title, onPress }: { icon: SFSymbol; title: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.compact, { backgroundColor: theme.cardBackground, borderColor: theme.divider, borderRadius: theme.isEditorial ? 2 : 24 }]}>
      <Text style={[styles.compactTitle, { color: theme.primaryText }]}>{title}</Text>
      <ThemedIconTile name={icon} size={36} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 24, bottom: 24, alignItems: 'flex-end', gap: 12 },
  menu: { alignItems: 'flex-end', gap: 10 },
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderWidth: 1,
  },
  compactTitle: { fontSize: 14, fontWeight: '600' },
  fab: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
});
