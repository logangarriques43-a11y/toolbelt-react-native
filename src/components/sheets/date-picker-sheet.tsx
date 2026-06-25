/**
 * DatePickerSheet — bottom sheet wrapping the native inline calendar
 * (@react-native-community/datetimepicker). Port of DatePickerSheet
 * (CreateAppointmentView.swift), which used SwiftUI's .graphical DatePicker.
 */

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function DatePickerSheet({
  visible,
  date,
  onChange,
  onClose,
}: {
  visible: boolean;
  date: string; // ISO
  onChange: (iso: string) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();

  const handle = (_e: DateTimePickerEvent, selected?: Date) => {
    if (selected) onChange(selected.toISOString());
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Select Date</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <DateTimePicker
          value={new Date(date)}
          mode="date"
          display="inline"
          accentColor={iOSColors.blue}
          onChange={handle}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700' },
  done: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
});
