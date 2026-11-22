/**
 * DatePickerSheet in the browser. The native inline calendar
 * (@react-native-community/datetimepicker) has no web implementation, so the
 * sheet holds the browser's own date input instead. Same props and header
 * (Cancel · Select Date · Done) as `date-picker-sheet.tsx`.
 */

import { createElement, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme-context';

/** ISO timestamp → "YYYY-MM-DD" in local time (what <input type="date"> uses). */
function toInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

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
  const input = useRef<HTMLInputElement | null>(null);
  /** Bumped each time the sheet opens, so the field starts from the current date. */
  const [opening, setOpening] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setOpening((n) => n + 1);
    // Open the browser's calendar straight away where it's supported.
    const t = setTimeout(() => {
      try {
        input.current?.focus();
        input.current?.showPicker?.();
      } catch {
        // showPicker() needs a user gesture in some browsers; focus is enough.
      }
    }, 50);
    return () => clearTimeout(t);
  }, [visible]);

  const handle = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const [y, m, d] = value.split('-').map(Number);
    const prev = new Date(date);
    // Keep the time of day the caller had; only the calendar day changes.
    const next = new Date(y, m - 1, d, prev.getHours() || 12, prev.getMinutes(), 0, 0);
    onChange(next.toISOString());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.cardBackground, borderRadius: theme.cornerRadius + 6 }]}>
          <View style={styles.header}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.cancel, { color: theme.secondaryText }]}>Cancel</Text>
            </Pressable>
            <Text style={theme.display(20)}>Select Date</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={[styles.done, { color: theme.accent }]}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.body}>
            {createElement('input', {
              // Uncontrolled: while someone types a date the field is briefly
              // invalid (value ""), and a controlled input would snap back to
              // the old date mid-typing. Remount per opening to pick up `date`.
              key: opening,
              ref: input,
              type: 'date',
              defaultValue: toInputValue(date),
              onChange: (e: { target: { value: string } }) => handle(e.target.value),
              style: {
                fontSize: 18,
                padding: '12px 14px',
                borderRadius: theme.cornerRadius,
                border: `1px solid ${theme.divider}`,
                background: theme.inputBackground,
                color: theme.primaryText,
                colorScheme: theme.isDark ? 'dark' : 'light',
                width: '100%',
                boxSizing: 'border-box',
              },
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: { width: '100%', maxWidth: 420, paddingBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  body: { paddingHorizontal: 20 },
  cancel: { fontSize: 16, fontWeight: '500' },
  done: { fontSize: 16, fontWeight: '600' },
});
