/**
 * ScheduleHeader + DropdownDatePicker — port of ScheduleHeader.swift.
 * Hamburger menu, calendar-settings, and AI Assistant are stubbed (2d / later);
 * Home returns to the dashboard, and the month dropdown opens a mini calendar
 * with per-day appointment color dots.
 */

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { isToday } from '@/lib/schedule-layout';
import type { Appointment } from '@/models/appointment';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const monthYearFmt = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
const fullMonthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ScheduleHeader({
  displayedDate,
  onDateChange,
  appointments,
  onHome,
  onOpenSwitcher,
  onMenu,
}: {
  displayedDate: Date;
  onDateChange: (d: Date) => void;
  appointments: Appointment[];
  onHome: () => void;
  onOpenSwitcher: () => void;
  onMenu: () => void;
}) {
  const theme = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const stub = (what: string) => Alert.alert('Coming soon', `${what} arrives in a later phase.`);

  return (
    <View>
      <View style={[styles.row, { backgroundColor: withOpacity(theme.cardBackground, 0.95) }]}>
        <Pressable onPress={onMenu} hitSlop={6} style={styles.iconBtn}>
          <Icon name="line.3.horizontal" size={20} color={iOSColors.blue} />
        </Pressable>
        <Pressable onPress={onHome} hitSlop={6} style={styles.iconBtn}>
          <Icon name="house.fill" size={20} color={iOSColors.blue} />
        </Pressable>
        <Pressable onPress={() => setShowPicker((s) => !s)} style={styles.monthBtn}>
          <Text style={[styles.month, { color: theme.primaryText }]}>{monthYearFmt.format(displayedDate)}</Text>
          <Icon name={showPicker ? 'chevron.up' : 'chevron.down'} size={10} weight="semibold" color={theme.secondaryText} />
        </Pressable>

        <View style={styles.spacer} />

        <Pressable onPress={onOpenSwitcher} hitSlop={6} style={[styles.settingsBtn, { backgroundColor: theme.cardBackground }]}>
          <Icon name="slider.horizontal.3" size={16} color={Brand.accent} />
        </Pressable>
        <Pressable onPress={() => stub('The AI Assistant')}>
          <LinearGradient colors={Brand.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.aiBtn}>
            <Icon name="sparkles" size={11} color="#FFFFFF" />
            <Text style={styles.aiText}>AI Assistant</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {showPicker ? (
        <DropdownDatePicker
          displayedDate={displayedDate}
          appointments={appointments}
          onSelect={(d) => { onDateChange(d); setShowPicker(false); }}
        />
      ) : null}
    </View>
  );
}

function DropdownDatePicker({
  displayedDate,
  appointments,
  onSelect,
}: {
  displayedDate: Date;
  appointments: Appointment[];
  onSelect: (d: Date) => void;
}) {
  const theme = useAppTheme();
  const [pickerMonth, setPickerMonth] = useState(new Date(displayedDate));

  const colorsByDay = new Map<string, string[]>();
  for (const a of appointments) {
    const d = new Date(a.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = colorsByDay.get(key) ?? [];
    if (!arr.includes(a.serviceColor)) arr.push(a.serviceColor);
    colorsByDay.set(key, arr);
  }

  const first = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const changeMonth = (delta: number) =>
    setPickerMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -50) runOnJS(changeMonth)(1);
      else if (e.translationX > 50) runOnJS(changeMonth)(-1);
    });

  return (
    <View style={[styles.dropdown, { backgroundColor: theme.cardBackground, shadowColor: theme.shadowColor }]}>
      <Text style={[styles.dropdownTitle, { color: theme.primaryText }]}>{fullMonthFmt.format(pickerMonth)}</Text>
      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <Text key={i} style={[styles.dow, { color: theme.secondaryText }]}>{d}</Text>
        ))}
      </View>
      <GestureDetector gesture={pan}>
        <View style={styles.grid}>
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === pickerMonth.getMonth();
            const selected = sameDay(d, displayedDate);
            const today = isToday(d);
            const dots = (colorsByDay.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? []).slice(0, 3);
            return (
              <Pressable key={i} onPress={() => onSelect(d)} style={styles.cell}>
                <View
                  style={[
                    styles.cellCircle,
                    selected ? { backgroundColor: iOSColors.blue } : null,
                    !selected && today ? { borderWidth: 2, borderColor: iOSColors.blue } : null,
                  ]}>
                  <Text
                    style={[
                      styles.cellDay,
                      {
                        color: selected ? '#FFFFFF' : inMonth ? theme.primaryText : withOpacity(iOSColors.gray, 0.4),
                        fontWeight: today || selected ? '700' : '400',
                      },
                    ]}>
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.dots}>
                  {dots.map((c, j) => (
                    <View key={j} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  month: { fontSize: 16, fontWeight: '700' },
  spacer: { flex: 1 },
  settingsBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, width: 110, height: 36, borderRadius: 18 },
  aiText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  dropdown: { padding: 16, gap: 4, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  dropdownTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', paddingTop: 4 },
  dowRow: { flexDirection: 'row', paddingBottom: 4 },
  dow: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cellDay: { fontSize: 14 },
  dots: { flexDirection: 'row', gap: 2, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
