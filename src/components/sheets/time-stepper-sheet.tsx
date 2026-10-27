/**
 * TimeStepperSheet — hour / minute (±5) / AM-PM stepper with quick-select
 * times. Port of AppointmentTimePickerSheet (CreateAppointmentView.swift).
 * Controlled: edits call onChange live; Done dismisses.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

const QUICK = [
  { label: '9:00', h: 9, m: 0, pm: false },
  { label: '10:00', h: 10, m: 0, pm: false },
  { label: '11:00', h: 11, m: 0, pm: false },
  { label: '12:00', h: 12, m: 0, pm: true },
  { label: '2:00', h: 2, m: 0, pm: true },
  { label: '4:00', h: 4, m: 0, pm: true },
  { label: '5:00', h: 5, m: 0, pm: true },
  { label: '6:00', h: 6, m: 0, pm: true },
  { label: '7:00', h: 7, m: 0, pm: true },
];

export function TimeStepperSheet({
  visible,
  hour,
  minute,
  isPM,
  title,
  onChange,
  onClose,
}: {
  visible: boolean;
  hour: number;
  minute: number;
  isPM: boolean;
  title: string;
  /** Ignored — the sheet always uses the look's accent. Kept for existing callers. */
  accent?: string;
  onChange: (hour: number, minute: number, isPM: boolean) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const accent = theme.accent;
  const chipRadius = theme.isEditorial ? 2 : 999;

  const decHour = () => onChange(hour > 1 ? hour - 1 : 12, minute, isPM);
  const incHour = () => onChange(hour < 12 ? hour + 1 : 1, minute, isPM);
  const decMin = () => onChange(hour, minute > 0 ? minute - 5 : 55, isPM);
  const incMin = () => onChange(hour, minute + 5 >= 60 ? 0 : minute + 5, isPM);

  const preview = `${hour === 0 ? 12 : hour}:${String(minute).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.inputBackground }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text style={theme.display(20)}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.done, { color: accent }]}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.clockRow}>
            <View style={[styles.unit, theme.card]}>
              <Text style={[styles.unitLabel, { color: theme.secondaryText }]}>Hour</Text>
              <View style={styles.unitControls}>
                <Pressable onPress={decHour} hitSlop={6}><Icon name="minus.circle.fill" size={28} color={accent} /></Pressable>
                <Text style={[styles.unitValue, { color: theme.primaryText }]}>{hour}</Text>
                <Pressable onPress={incHour} hitSlop={6}><Icon name="plus.circle.fill" size={28} color={accent} /></Pressable>
              </View>
            </View>

            <Text style={[styles.colon, { color: theme.secondaryText }]}>:</Text>

            <View style={[styles.unit, theme.card]}>
              <Text style={[styles.unitLabel, { color: theme.secondaryText }]}>Min</Text>
              <View style={styles.unitControls}>
                <Pressable onPress={decMin} hitSlop={6}><Icon name="minus.circle.fill" size={28} color={accent} /></Pressable>
                <Text style={[styles.unitValue, { color: theme.primaryText }]}>{String(minute).padStart(2, '0')}</Text>
                <Pressable onPress={incMin} hitSlop={6}><Icon name="plus.circle.fill" size={28} color={accent} /></Pressable>
              </View>
            </View>

            <View style={styles.ampm}>
              <Pressable
                onPress={() => onChange(hour, minute, false)}
                style={[styles.ampmBtn, { backgroundColor: !isPM ? accent : theme.cardBackground, borderRadius: theme.isEditorial ? 2 : 8 }]}>
                <Text style={[styles.ampmText, { color: !isPM ? theme.onAccent : theme.secondaryText }]}>AM</Text>
              </Pressable>
              <Pressable
                onPress={() => onChange(hour, minute, true)}
                style={[styles.ampmBtn, { backgroundColor: isPM ? accent : theme.cardBackground, borderRadius: theme.isEditorial ? 2 : 8 }]}>
                <Text style={[styles.ampmText, { color: isPM ? theme.onAccent : theme.secondaryText }]}>PM</Text>
              </Pressable>
            </View>
          </View>

          <Text style={[styles.preview, { color: accent, backgroundColor: theme.accentSoft, borderRadius: chipRadius }]}>{preview}</Text>

          <Text style={[styles.quickLabel, { color: theme.secondaryText }]}>Quick Select</Text>
          <View style={styles.quickGrid}>
            {QUICK.map((q) => {
              const active = hour === q.h && minute === q.m && isPM === q.pm;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => onChange(q.h, q.m, q.pm)}
                  style={[styles.chip, { borderColor: active ? accent : theme.divider, backgroundColor: active ? accent : theme.cardBackground, borderRadius: chipRadius }]}>
                  <Text style={[styles.chipText, { color: active ? theme.onAccent : accent }]}>{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, fontWeight: '500' },
  done: { fontSize: 16, fontWeight: '600' },
  body: { padding: 16, gap: 20, alignItems: 'center' },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unit: { alignItems: 'center', gap: 8, padding: 12 },
  unitLabel: { fontSize: 12, fontWeight: '500' },
  unitControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unitValue: { fontSize: 36, fontWeight: '700', width: 44, textAlign: 'center' },
  colon: { fontSize: 36, fontWeight: '700' },
  ampm: { gap: 6 },
  ampmBtn: { width: 50, height: 38, alignItems: 'center', justifyContent: 'center' },
  ampmText: { fontSize: 16, fontWeight: '700' },
  preview: { fontSize: 18, fontWeight: '600', paddingHorizontal: 20, paddingVertical: 10, overflow: 'hidden' },
  quickLabel: { fontSize: 12, fontWeight: '500' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
});
