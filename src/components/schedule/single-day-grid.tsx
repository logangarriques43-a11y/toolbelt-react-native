/**
 * SingleDayGrid — the scrollable day time-grid with positioned appointment
 * blocks and a current-time indicator. Port of SingleDayContent /
 * SingleDayGridBackground / overlay (SingleDayScheduleGrid.swift).
 *
 * Closed-hours shading dims non-working slots; when the calendar is filtered to
 * one staff member (`selectedStaff`), it dims THAT person's off-hours + lunch.
 * Appointment cards are tinted with their assigned staff member's color.
 */

import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { AppointmentBlock } from '@/components/schedule/appointment-block';
import { TimeOffBand } from '@/components/schedule/time-off-band';
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

export function SingleDayGrid({
  date,
  appointments,
  currentTime,
  onAppointmentPress,
  onSwipe,
  selectedStaff = null,
  staff = [],
}: {
  date: Date;
  appointments: Appointment[];
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
  const eff = effectiveHours(date, getSchedule(date), selectedStaff);

  const canManageTimeOff = can('manageTimeOff');
  const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
  const timeOffBlocks = blockingTimeOff(timeOffEvents, date, selectedStaff?.id ?? undefined);

  const availableWidth = width - TIME_COL_WIDTH;
  const maxBlockWidth = availableWidth - 16;
  const layout = calcOverlapLayout(appointments);
  const today = isToday(date);

  // Scroll near the current hour on mount when viewing today.
  useEffect(() => {
    if (!today) return;
    const hour = new Date().getHours();
    const y = Math.max(0, hour * 2 - 2) * SLOT_HEIGHT;
    const t = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 0);
    return () => clearTimeout(t);
  }, [today]);

  const pan = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onEnd((e) => {
      const threshold = width * 0.25;
      if (e.translationX < -threshold) runOnJS(onSwipe)(1);
      else if (e.translationX > threshold) runOnJS(onSwipe)(-1);
    });

  const indicatorY = today
    ? (currentTime.getHours() * 60 + currentTime.getMinutes()) * 2 - 8
    : 0;
  const indicatorTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(currentTime);

  return (
    <GestureDetector gesture={pan}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator>
        <View style={{ height: GRID_HEIGHT }}>
          {/* Background slots */}
          {LABELS.map((label, i) => {
            const working = isEffectiveWorkingTime(eff, Math.floor(i / 2), (i % 2) * 30);
            return (
              <View key={i} style={[styles.slot, { borderTopColor: withOpacity(iOSColors.gray, 0.25) }]}>
                <Text numberOfLines={1} allowFontScaling={false} style={[styles.slotLabel, { color: theme.secondaryText }]}>{label}</Text>
                <View style={[styles.slotColumn, { borderLeftColor: theme.divider, backgroundColor: working ? 'transparent' : nonWorking }]} />
              </View>
            );
          })}

          {/* Current time indicator */}
          {today ? (
            <View style={[styles.indicator, { top: indicatorY }]} pointerEvents="none">
              <View style={styles.indicatorTimeWrap}>
                <Text style={styles.indicatorTime}>{indicatorTime}</Text>
              </View>
              <View style={styles.indicatorDot} />
              <View style={styles.indicatorLine} />
            </View>
          ) : null}

          {/* Time-off blocked bands (drawn under appointments) */}
          {timeOffBlocks.map((ev) => {
            const bandStart = Math.max(new Date(ev.startTime).getTime(), dayStart.getTime());
            const bandEnd = Math.min(new Date(ev.endTime).getTime(), dayEnd.getTime());
            const startMin = (bandStart - dayStart.getTime()) / 60000;
            const durationMin = Math.max((bandEnd - bandStart) / 60000, 20);
            return (
              <TimeOffBand
                key={ev.id}
                event={ev}
                top={startMin * PX_PER_MIN}
                left={TIME_COL_WIDTH + 8}
                width={maxBlockWidth}
                height={durationMin * PX_PER_MIN}
                canManage={canManageTimeOff}
                onDelete={() => deleteEvent(ev.id)}
                onRequestCancel={() => updateEvent({ ...ev, cancellationRequested: true })}
              />
            );
          })}

          {/* Appointment blocks */}
          {appointments.map((a) => {
            const info = layout[a.id] ?? { columnIndex: 0, totalColumns: 1 };
            const cols = Math.max(info.totalColumns, 1);
            const bw = (maxBlockWidth - (cols - 1) * 4) / cols;
            const left = TIME_COL_WIDTH + 8 + info.columnIndex * (bw + 4);
            return (
              <View key={a.id} style={{ position: 'absolute', top: offsetForTime(a.startTime), left, height: blockHeight(a) }}>
                <AppointmentBlock appointment={a} width={bw} onPress={() => onAppointmentPress(a)} staffTint={staffTint(a, staff)} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slot: { flexDirection: 'row', height: SLOT_HEIGHT, borderTopWidth: 1 },
  slotLabel: { width: TIME_COL_WIDTH, fontSize: 10, fontWeight: '500', textAlign: 'center', textAlignVertical: 'center' },
  slotColumn: { flex: 1, borderLeftWidth: 1 },
  indicator: { position: 'absolute', left: 0, right: 0, height: 16, flexDirection: 'row', alignItems: 'center', zIndex: 100 },
  indicatorTimeWrap: { width: TIME_COL_WIDTH, alignItems: 'center' },
  indicatorTime: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', backgroundColor: iOSColors.red, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  indicatorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: iOSColors.red },
  indicatorLine: { flex: 1, height: 2, backgroundColor: iOSColors.red },
});
