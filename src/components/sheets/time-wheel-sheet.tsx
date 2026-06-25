/**
 * TimeWheelSheet — hours/minutes stepper bottom sheet with quick-select chips.
 * Port of TimeWheelPickerSheet (AddServiceView.swift). Controlled: edits call
 * onChange live, Done just dismisses.
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const MINUTE_STEPS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK = [
  { label: '15m', h: 0, m: 15 },
  { label: '30m', h: 0, m: 30 },
  { label: '45m', h: 0, m: 45 },
  { label: '1h', h: 1, m: 0 },
  { label: '1.5h', h: 1, m: 30 },
  { label: '2h', h: 2, m: 0 },
];

export function TimeWheelSheet({
  visible,
  hours,
  minutes,
  title,
  onChange,
  onClose,
}: {
  visible: boolean;
  hours: number;
  minutes: number;
  title: string;
  onChange: (hours: number, minutes: number) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  const stepMinute = (dir: 1 | -1) => {
    const i = MINUTE_STEPS.indexOf(minutes);
    const next = Math.min(MINUTE_STEPS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir));
    onChange(hours, MINUTE_STEPS[next]);
  };

  const preview = () => {
    if (hours === 0 && minutes === 0) return '0 minutes';
    if (hours === 0) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    if (minutes === 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${hours} hour${hours === 1 ? '' : 's'} ${minutes} min`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.inputBackground }]}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.steppers}>
            <Stepper
              label="Hours"
              unit="h"
              value={hours}
              onDec={() => hours > 0 && onChange(hours - 1, minutes)}
              onInc={() => hours < 12 && onChange(hours + 1, minutes)}
              decDisabled={hours <= 0}
              incDisabled={hours >= 12}
            />
            <Stepper
              label="Minutes"
              unit="min"
              value={minutes}
              onDec={() => stepMinute(-1)}
              onInc={() => stepMinute(1)}
              decDisabled={minutes <= 0}
              incDisabled={minutes >= 55}
            />
          </View>

          <Text style={[styles.preview, { backgroundColor: withOpacity(iOSColors.blue, 0.1) }]}>
            {preview()}
          </Text>

          <Text style={[styles.quickLabel, { color: theme.secondaryText }]}>Quick Select</Text>
          <View style={styles.quickGrid}>
            {QUICK.map((q) => {
              const active = hours === q.h && minutes === q.m;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => onChange(q.h, q.m)}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? iOSColors.blue : theme.cardBackground },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? '#FFFFFF' : iOSColors.blue }]}>
                    {q.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Stepper({
  label,
  unit,
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  label: string;
  unit: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  decDisabled: boolean;
  incDisabled: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.stepperLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable onPress={onDec} disabled={decDisabled} hitSlop={6}>
          <Icon
            name="minus.circle.fill"
            size={28}
            color={decDisabled ? withOpacity(iOSColors.gray, 0.3) : iOSColors.blue}
          />
        </Pressable>
        <Text style={[styles.stepperValue, { color: theme.primaryText }]}>{value}</Text>
        <Pressable onPress={onInc} disabled={incDisabled} hitSlop={6}>
          <Icon
            name="plus.circle.fill"
            size={28}
            color={incDisabled ? withOpacity(iOSColors.gray, 0.3) : iOSColors.blue}
          />
        </Pressable>
      </View>
      <Text style={[styles.stepperUnit, { color: theme.secondaryText }]}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  body: { padding: 16, gap: 20, alignItems: 'center' },
  steppers: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  stepper: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  stepperLabel: { fontSize: 12, fontWeight: '500' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperValue: { fontSize: 36, fontWeight: '700', width: 44, textAlign: 'center' },
  stepperUnit: { fontSize: 14, fontWeight: '500' },
  preview: {
    fontSize: 18,
    fontWeight: '600',
    color: iOSColors.blue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  quickLabel: { fontSize: 12, fontWeight: '500' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: iOSColors.blue,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
});
