/**
 * ViewSwitcherSheet — pick the calendar view mode (a lightweight stand-in for
 * CalendarSettingsPanel.swift's view-type section). Week / 3-Day are listed but
 * disabled until those grids land (2c-iii).
 */

import type { SFSymbol } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export type ScheduleViewType = 'schedule' | 'day' | 'threeDay' | 'week' | 'month';

const OPTIONS: { value: ScheduleViewType; label: string; desc: string; icon: SFSymbol; enabled: boolean }[] = [
  { value: 'schedule', label: 'Schedule', desc: 'Agenda list of appointments', icon: 'list.bullet.rectangle', enabled: true },
  { value: 'day', label: 'Day', desc: 'Single-day timeline', icon: 'calendar.day.timeline.left', enabled: true },
  { value: 'threeDay', label: '3 Day', desc: 'Three days at a glance', icon: 'calendar.day.timeline.left', enabled: true },
  { value: 'week', label: 'Week', desc: 'Full week timeline', icon: 'calendar', enabled: true },
  { value: 'month', label: 'Month', desc: 'Month overview', icon: 'calendar', enabled: true },
];

export function ViewSwitcherSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onWorkingHours,
}: {
  visible: boolean;
  selected: ScheduleViewType;
  onSelect: (v: ScheduleViewType) => void;
  onClose: () => void;
  onWorkingHours?: () => void;
}) {
  const theme = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.primaryText }]}>Calendar View</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        <View style={styles.list}>
          {OPTIONS.map((o) => {
            const active = o.value === selected;
            return (
              <Pressable
                key={o.value}
                disabled={!o.enabled}
                onPress={() => { onSelect(o.value); onClose(); }}
                style={[styles.row, active ? { backgroundColor: withOpacity(iOSColors.blue, 0.1) } : null, !o.enabled ? styles.disabled : null]}>
                <View style={[styles.iconWrap, { backgroundColor: withOpacity(iOSColors.blue, 0.12) }]}>
                  <Icon name={o.icon} size={18} color={iOSColors.blue} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.primaryText }]}>{o.label}</Text>
                  <Text style={[styles.rowDesc, { color: theme.secondaryText }]}>{o.desc}</Text>
                </View>
                {active ? <Icon name="checkmark.circle.fill" size={22} color={iOSColors.blue} /> : null}
              </Pressable>
            );
          })}
        </View>

        {onWorkingHours ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Pressable
              onPress={() => { onClose(); onWorkingHours(); }}
              style={[styles.row, styles.footerRow]}>
              <View style={[styles.iconWrap, { backgroundColor: withOpacity(iOSColors.blue, 0.12) }]}>
                <Icon name="clock" size={18} color={iOSColors.blue} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.primaryText }]}>Working Hours</Text>
                <Text style={[styles.rowDesc, { color: theme.secondaryText }]}>Set your weekly schedule</Text>
              </View>
              <Icon name="chevron.right" size={14} color={theme.secondaryText} />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  divider: { height: StyleSheet.hairlineWidth },
  list: { padding: 12, gap: 4 },
  footerRow: { marginHorizontal: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12 },
  disabled: { opacity: 0.45 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowDesc: { fontSize: 13 },
});
