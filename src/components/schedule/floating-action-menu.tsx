/**
 * FloatingActionMenu — expandable FAB on the schedule. Port of
 * FloatingActionMenu.swift. Tapping the + reveals Appointment / Time Off /
 * Invoice actions and rotates the button to an ×.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { iOSColors } from '@/theme/tokens';
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
          <CompactButton icon="calendar.badge.plus" title="Appointment" color={iOSColors.blue} onPress={() => pick(onCreateAppointment)} />
          <CompactButton icon="clock.badge.xmark" title="Time Off" color={iOSColors.orange} onPress={() => pick(onTimeOff)} />
          <CompactButton icon="doc.text.fill" title="Invoice" color={iOSColors.green} onPress={() => pick(onInvoice)} />
        </View>
      ) : null}

      <Pressable onPress={toggle}>
        <LinearGradient
          colors={[iOSColors.blue, 'rgba(0,122,255,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}>
          <Animated.View style={iconStyle}>
            <Icon name={open ? 'xmark' : 'plus'} size={24} weight="bold" color="#FFFFFF" />
          </Animated.View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function CompactButton({ icon, title, color, onPress }: { icon: SFSymbol; title: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.compact, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.compactTitle, { color: theme.primaryText }]}>{title}</Text>
      <View style={[styles.compactIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={16} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 24, bottom: 24, alignItems: 'flex-end', gap: 12 },
  menu: { alignItems: 'flex-end', gap: 10 },
  compact: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderRadius: 24,
    shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  compactTitle: { fontSize: 14, fontWeight: '600' },
  compactIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: iOSColors.blue, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
});
