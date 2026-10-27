/**
 * ViewSwitcherSheet — pick the calendar view mode (a lightweight stand-in for
 * CalendarSettingsPanel.swift's view-type section). Week / 3-Day are listed but
 * disabled until those grids land (2c-iii).
 */

import type { SFSymbol } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedIconTile } from '@/components/themed';
import { withOpacity } from '@/lib/color';
import { staffInitials, type StaffMember } from '@/models/staff';
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
  staff,
  selectedStaffId = null,
  onSelectStaff,
}: {
  visible: boolean;
  selected: ScheduleViewType;
  onSelect: (v: ScheduleViewType) => void;
  onClose: () => void;
  onWorkingHours?: () => void;
  /** When provided (with onSelectStaff), renders a "Staff" filter section. */
  staff?: StaffMember[];
  selectedStaffId?: string | null;
  onSelectStaff?: (id: string | null) => void;
}) {
  const theme = useAppTheme();
  const showStaff = staff != null && onSelectStaff != null && staff.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Text style={theme.display(20)}>Calendar View</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
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
                style={[styles.row, { borderRadius: theme.cornerRadius }, active ? { backgroundColor: theme.accentSoft } : null, !o.enabled ? styles.disabled : null]}>
                <ThemedIconTile name={o.icon} size={44} filled={active} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: theme.primaryText }]}>{o.label}</Text>
                  <Text style={[styles.rowDesc, { color: theme.secondaryText }]}>{o.desc}</Text>
                </View>
                {active ? <Icon name="checkmark.circle.fill" size={22} color={theme.accent} /> : null}
              </Pressable>
            );
          })}
        </View>

        {showStaff ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>Staff</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffRow}>
              <StaffChip label="All staff" initials="All" active={selectedStaffId == null} onPress={() => { onSelectStaff!(null); onClose(); }} />
              {staff!.map((m) => (
                <StaffChip
                  key={m.id}
                  label={m.name}
                  initials={staffInitials(m.name)}
                  color={m.colorHex || undefined}
                  active={selectedStaffId === m.id}
                  onPress={() => { onSelectStaff!(m.id); onClose(); }}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {onWorkingHours ? (
          <>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <Pressable
              onPress={() => { onClose(); onWorkingHours(); }}
              style={[styles.row, styles.footerRow, { borderRadius: theme.cornerRadius }]}>
              <ThemedIconTile name="clock" size={44} />
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: theme.primaryText }]}>Working Hours</Text>
                <Text style={[styles.rowDesc, { color: theme.secondaryText }]}>Set your weekly schedule</Text>
              </View>
              <Icon name="chevron.right" size={14} color={theme.chevronTint} />
            </Pressable>
          </>
        ) : null}
      </View>
    </Modal>
  );
}

function StaffChip({ label, initials, color, active, onPress }: { label: string; initials: string; color?: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const tint = color ?? theme.accent;
  // User-picked staff colours keep white initials; the "All" chip uses the accent.
  const activeFg = color ? '#FFFFFF' : theme.onAccent;
  return (
    <Pressable onPress={onPress} style={styles.chip}>
      <View style={[styles.chipAvatar, { backgroundColor: active ? tint : color ? withOpacity(tint, 0.15) : theme.accentSoft, borderColor: active ? tint : 'transparent' }]}>
        <Text style={[styles.chipInitials, { color: active ? activeFg : tint }]} numberOfLines={1}>{initials}</Text>
      </View>
      <Text style={[styles.chipLabel, { color: active ? theme.primaryText : theme.secondaryText, fontWeight: active ? '700' : '500' }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  staffRow: { gap: 14, paddingHorizontal: 16, paddingVertical: 8 },
  chip: { alignItems: 'center', gap: 4, width: 60 },
  chipAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  chipInitials: { fontSize: 14, fontWeight: '700' },
  chipLabel: { fontSize: 11, textAlign: 'center' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  done: { fontSize: 16, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth },
  list: { padding: 12, gap: 4 },
  footerRow: { marginHorizontal: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  disabled: { opacity: 0.45 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 16, fontWeight: '600' },
  rowDesc: { fontSize: 13 },
});
