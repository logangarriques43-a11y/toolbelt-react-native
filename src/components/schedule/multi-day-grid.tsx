/**
 * MultiDayGrid — N-column time grid for the Week (7) and 3-Day (3) views.
 * Port of WeeklyContent / WeeklyGridBackground / overlay (WeeklyScheduleGrid.swift),
 * parameterized over the date columns. Closed-hours shading dims non-working
 * slots — per selected staff member's off-hours + lunch when one is filtered.
 */

import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { CompactAppointmentBlock } from '@/components/schedule/compact-appointment-block';
import { TimeOffBand } from '@/components/schedule/time-off-band';
import { Icon } from '@/components/icon';
import { usePermissions } from '@/context/permissions-store';
import { useTimeOff } from '@/context/time-off-store';
import { useWorkingHours } from '@/context/working-hours-store';
import { withOpacity } from '@/lib/color';
import {
  GRID_HEIGHT, PX_PER_MIN, SLOT_HEIGHT, TIME_COL_WIDTH, blockHeight, calcOverlapLayout,
  isToday, offsetForTime, timeSlotLabels,
} from '@/lib/schedule-layout';
import { effectiveHours, isEffectiveWorkingTime, staffTint } from '@/lib/staff-shading';
import type { Appointment } from '@/models/appointment';
import { blockingTimeOff } from '@/models/time-off';
import type { StaffMember } from '@/models/staff';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const LABELS = timeSlotLabels();
const dayNumFmt = new Intl.DateTimeFormat('en-US', { day: 'numeric' });
const dayNameFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

export function MultiDayGrid({
  dates,
  getAppointments,
  currentTime,
  onAppointmentPress,
  onSwipe,
  selectedStaff = null,
  staff = [],
}: {
  dates: Date[];
  getAppointments: (date: Date) => Appointment[];
  currentTime: Date;
  onAppointmentPress: (a: Appointment) => void;
  onSwipe: (dir: -1 | 1) => void;
  selectedStaff?: StaffMember | null;
  staff?: StaffMember[];
}) {
  const theme = useAppTheme();
  const { getSchedule } = useWorkingHours();
  const { events: timeOffEvents, deleteEvent, updateEvent } = useTimeOff();
  const { can } = usePermissions();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const nonWorking = withOpacity(iOSColors.gray, 0.08);
  const canManageTimeOff = can('manageTimeOff');
  // Effective (staff-resolved) hours per column, computed once.
  const effs = dates.map((d) => effectiveHours(d, getSchedule(d), selectedStaff));

  const dayCount = dates.length;
  const dayWidth = (width - TIME_COL_WIDTH) / dayCount;
  const anyToday = dates.some(isToday);

  useEffect(() => {
    if (!anyToday) return;
    const hour = new Date().getHours();
    const y = Math.max(0, hour * 2 - 2) * SLOT_HEIGHT;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(t);
  }, [anyToday]);

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      const threshold = width * 0.25;
      if (e.translationX < -threshold) runOnJS(onSwipe)(1);
      else if (e.translationX > threshold) runOnJS(onSwipe)(-1);
    });

  const todayIndex = dates.findIndex(isToday);
  const indicatorY = (currentTime.getHours() * 60 + currentTime.getMinutes()) * 2 - 5;
  const indicatorTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(currentTime);

  return (
    <View style={styles.root}>
      {/* Day header row */}
      <View style={styles.headerRow}>
        <View style={styles.clockCol}>
          <Icon name="clock" size={16} color={theme.secondaryText} />
        </View>
        {dates.map((d, i) => {
          const today = isToday(d);
          return (
            <View
              key={i}
              style={[styles.headerDay, { borderLeftColor: theme.divider, backgroundColor: today ? withOpacity(iOSColors.blue, 0.1) : 'transparent' }]}>
              <Text style={[styles.headerNum, { color: today ? iOSColors.blue : theme.primaryText }]}>{dayNumFmt.format(d)}</Text>
              <Text style={[styles.headerName, { color: today ? iOSColors.blue : theme.secondaryText }]}>{dayNameFmt.format(d).toUpperCase()}</Text>
            </View>
          );
        })}
      </View>

      <GestureDetector gesture={pan}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator>
          <View style={{ height: GRID_HEIGHT }}>
            {/* Background slots */}
            {LABELS.map((label, i) => {
              const hour = Math.floor(i / 2);
              const minute = (i % 2) * 30;
              return (
                <View key={i} style={[styles.slot, { borderTopColor: withOpacity(iOSColors.gray, 0.25) }]}>
                  <Text style={[styles.slotLabel, { color: theme.secondaryText }]}>{label}</Text>
                  {dates.map((dd, c) => (
                    <View
                      key={c}
                      style={[styles.dayColumn, { borderLeftColor: theme.divider, backgroundColor: isEffectiveWorkingTime(effs[c], hour, minute) ? 'transparent' : nonWorking }]}
                    />
                  ))}
                </View>
              );
            })}

            {/* Current time indicator on today's column */}
            {todayIndex >= 0 ? (
              <View style={[styles.indicator, { top: indicatorY }]} pointerEvents="none">
                <View style={styles.indicatorTimeWrap}>
                  <Text style={styles.indicatorTime}>{indicatorTime}</Text>
                </View>
                <View style={[styles.indicatorBar, { left: TIME_COL_WIDTH + todayIndex * dayWidth, width: dayWidth }]}>
                  <View style={styles.indicatorDot} />
                  <View style={styles.indicatorLine} />
                </View>
              </View>
            ) : null}

            {/* Time-off blocked bands per column (under appointments) */}
            {dates.map((d, dayIndex) => {
              const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
              const xOffset = TIME_COL_WIDTH + dayIndex * dayWidth;
              return blockingTimeOff(timeOffEvents, d, selectedStaff?.id ?? undefined).map((ev) => {
                const bandStart = Math.max(new Date(ev.startTime).getTime(), dayStart.getTime());
                const bandEnd = Math.min(new Date(ev.endTime).getTime(), dayEnd.getTime());
                const startMin = (bandStart - dayStart.getTime()) / 60000;
                const durationMin = Math.max((bandEnd - bandStart) / 60000, 16);
                return (
                  <TimeOffBand
                    key={`${d.toISOString()}-${ev.id}`}
                    event={ev}
                    compact
                    top={startMin * PX_PER_MIN}
                    left={xOffset + 1}
                    width={dayWidth - 2}
                    height={durationMin * PX_PER_MIN}
                    canManage={canManageTimeOff}
                    onDelete={() => deleteEvent(ev.id)}
                    onRequestCancel={() => updateEvent({ ...ev, cancellationRequested: true })}
                  />
                );
              });
            })}

            {/* Per-day appointment blocks */}
            {dates.map((d, dayIndex) => {
              const items = getAppointments(d);
              const layout = calcOverlapLayout(items);
              const maxBlockWidth = dayWidth - 4;
              return items.map((a) => {
                const info = layout[a.id] ?? { columnIndex: 0, totalColumns: 1 };
                const cols = Math.max(info.totalColumns, 1);
                const bw = (maxBlockWidth - (cols - 1) * 2) / cols;
                const left = TIME_COL_WIDTH + dayIndex * dayWidth + 2 + info.columnIndex * (bw + 2);
                return (
                  <View key={a.id} style={{ position: 'absolute', top: offsetForTime(a.startTime), left, height: blockHeight(a) }}>
                    <CompactAppointmentBlock appointment={a} width={bw} onPress={() => onAppointmentPress(a)} staffTint={staffTint(a, staff)} />
                  </View>
                );
              });
            })}
          </View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', height: 60 },
  clockCol: { width: TIME_COL_WIDTH, alignItems: 'center', justifyContent: 'center' },
  headerDay: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, borderLeftWidth: 1 },
  headerNum: { fontSize: 16, fontWeight: '700' },
  headerName: { fontSize: 12, fontWeight: '500' },
  slot: { flexDirection: 'row', height: SLOT_HEIGHT, borderTopWidth: 1 },
  slotLabel: { width: TIME_COL_WIDTH, fontSize: 11, fontWeight: '500', textAlign: 'center', textAlignVertical: 'center' },
  dayColumn: { flex: 1, borderLeftWidth: 1 },
  indicator: { position: 'absolute', left: 0, right: 0, height: 16, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  indicatorTimeWrap: { width: TIME_COL_WIDTH, alignItems: 'center' },
  indicatorTime: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', backgroundColor: iOSColors.red, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  indicatorBar: { position: 'absolute', flexDirection: 'row', alignItems: 'center' },
  indicatorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: iOSColors.red },
  indicatorLine: { flex: 1, height: 2, backgroundColor: iOSColors.red },
});
