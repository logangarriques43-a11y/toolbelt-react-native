/**
 * MonthGrid — month calendar with per-day appointment blocks (or dots when too
 * many). Port of MonthScheduleGrid.swift. Tap a day to open it in day view; tap
 * an appointment to open detail. Swipe horizontally to change month.
 */

import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { withOpacity } from '@/lib/color';
import { isToday } from '@/lib/schedule-layout';
import type { Appointment } from '@/models/appointment';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_BLOCKS = 3;

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function MonthGrid({
  month,
  appointments,
  onMonthChange,
  onDayTap,
  onAppointmentPress,
}: {
  month: Date;
  appointments: Appointment[];
  onMonthChange: (delta: -1 | 1) => void;
  onDayTap: (date: Date) => void;
  onAppointmentPress: (a: Appointment) => void;
}) {
  const theme = useAppTheme();

  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const k = dayKey(new Date(a.startTime));
    const arr = byDay.get(k) ?? [];
    arr.push(a);
    byDay.set(k, arr);
  }

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const rows = Array.from({ length: 6 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => {
      const d = new Date(start);
      d.setDate(start.getDate() + r * 7 + c);
      return d;
    }),
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((e) => {
      if (e.translationX < -50) runOnJS(onMonthChange)(1);
      else if (e.translationX > 50) runOnJS(onMonthChange)(-1);
    });

  return (
    <View style={styles.root}>
      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <Text key={i} numberOfLines={1} allowFontScaling={false} style={[styles.dow, { color: theme.secondaryText }]}>{d}</Text>
        ))}
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.grid}>
          {rows.map((row, r) => (
            <View key={r} style={styles.weekRow}>
              {row.map((d) => {
                const inMonth = d.getMonth() === month.getMonth();
                const today = isToday(d);
                const items = (byDay.get(dayKey(d)) ?? []).sort(
                  (x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime(),
                );
                const showDots = items.length > MAX_BLOCKS;
                return (
                  <Pressable
                    key={dayKey(d)}
                    onPress={() => onDayTap(d)}
                    style={[
                      styles.cell,
                      { borderColor: theme.divider, backgroundColor: inMonth ? 'transparent' : withOpacity(iOSColors.gray, 0.05) },
                    ]}>
                    <View style={[styles.dayNumWrap, today ? { backgroundColor: iOSColors.blue } : null]}>
                      <Text
                        numberOfLines={1}
                        allowFontScaling={false}
                        style={[
                          styles.dayNum,
                          { color: today ? '#FFFFFF' : inMonth ? theme.primaryText : withOpacity(iOSColors.gray, 0.5), fontWeight: today ? '700' : '500' },
                        ]}>
                        {d.getDate()}
                      </Text>
                    </View>

                    {items.length === 0 ? null : showDots ? (
                      <View style={styles.dots}>
                        {items.slice(0, 8).map((a, i) => (
                          <View key={i} style={[styles.dot, { backgroundColor: a.serviceColor }]} />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.blocks}>
                        {items.slice(0, MAX_BLOCKS).map((a) => (
                          <Pressable key={a.id} onPress={() => onAppointmentPress(a)} style={[styles.block, { backgroundColor: a.serviceColor }]}>
                            <Text numberOfLines={1} style={styles.blockText}>{a.clientName}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dowRow: { flexDirection: 'row', height: 32 },
  dow: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', paddingVertical: 8 },
  grid: { flex: 1 },
  weekRow: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, borderWidth: StyleSheet.hairlineWidth, paddingTop: 4, alignItems: 'center', gap: 4 },
  // minWidth (not fixed width) + horizontal padding so two-digit dates (10–31)
  // fit; a fixed-width box clips the Text to one digit on Android.
  dayNumWrap: { minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 4, justifyContent: 'center' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  blocks: { alignSelf: 'stretch', gap: 2, paddingHorizontal: 2 },
  block: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  blockText: { fontSize: 10, fontWeight: '500', color: '#FFFFFF' },
});
