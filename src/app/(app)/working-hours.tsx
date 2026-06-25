/**
 * Working Hours editor — port of WorkingHoursView.swift, recast as a weekly
 * editor (one row per weekday with a working toggle + a start/end interval).
 * Changes apply live to the store.
 *
 * Simplified vs. Swift: one interval per day and no date-specific overrides
 * (the schedule grids + outside-hours warning read the weekly schedule).
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { ScreenHeader } from '@/components/screen-header';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { useWorkingHours } from '@/context/working-hours-store';
import { to24 } from '@/lib/appointment-time';
import { Brand, lightShadow } from '@/theme/tokens';
import { WEEKDAY_NAMES, intervalTimeString, type WorkingHoursInterval } from '@/models/working-hours';
import { useAppTheme } from '@/theme/theme-context';

const DEFAULT_INTERVAL: WorkingHoursInterval = { startHour: 9, startMinute: 0, endHour: 17, endMinute: 0 };

type Editing = { weekday: number; field: 'start' | 'end' };

function to12(hour: number, minute: number) {
  return { hour: hour > 12 ? hour - 12 : hour === 0 ? 12 : hour, minute, isPM: hour >= 12 };
}

export default function WorkingHoursScreen() {
  const theme = useAppTheme();
  const { weeklySchedule, setWeekday } = useWorkingHours();
  const [editing, setEditing] = useState<Editing | null>(null);

  const setWorking = (weekday: number, working: boolean) => {
    const cur = weeklySchedule[weekday];
    setWeekday(weekday, {
      isWorkingDay: working,
      intervals: working ? (cur?.intervals.length ? cur.intervals : [DEFAULT_INTERVAL]) : [],
    });
  };

  const setTime = (weekday: number, field: 'start' | 'end', h: number, m: number, pm: boolean) => {
    const cur = weeklySchedule[weekday];
    const interval = { ...(cur?.intervals[0] ?? DEFAULT_INTERVAL) };
    const h24 = to24(h, pm);
    if (field === 'start') {
      interval.startHour = h24;
      interval.startMinute = m;
    } else {
      interval.endHour = h24;
      interval.endMinute = m;
    }
    setWeekday(weekday, { isWorkingDay: true, intervals: [interval] });
  };

  const editInterval = editing ? weeklySchedule[editing.weekday]?.intervals[0] ?? DEFAULT_INTERVAL : DEFAULT_INTERVAL;
  const editTime = editing
    ? to12(
        editing.field === 'start' ? editInterval.startHour : editInterval.endHour,
        editing.field === 'start' ? editInterval.startMinute : editInterval.endMinute,
      )
    : { hour: 9, minute: 0, isPM: false };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Working Hours" />

        <ScrollView contentContainerStyle={styles.body}>
          {WEEKDAY_NAMES.map((name, weekday) => {
            const schedule = weeklySchedule[weekday] ?? { isWorkingDay: false, intervals: [] };
            const interval = schedule.intervals[0] ?? DEFAULT_INTERVAL;
            return (
              <View key={weekday} style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <View style={styles.dayRow}>
                  <Text style={[styles.dayName, { color: theme.primaryText }]}>{name}</Text>
                  <Switch
                    value={schedule.isWorkingDay}
                    onValueChange={(v) => setWorking(weekday, v)}
                    trackColor={{ true: Brand.accent, false: theme.divider }}
                  />
                </View>

                {schedule.isWorkingDay ? (
                  <View style={[styles.intervalRow, { borderTopColor: theme.divider }]}>
                    <Pressable
                      onPress={() => setEditing({ weekday, field: 'start' })}
                      style={[styles.timeBtn, { backgroundColor: theme.inputBackground }]}>
                      <Text style={[styles.timeText, { color: theme.primaryText }]}>
                        {intervalTimeString(interval.startHour, interval.startMinute)}
                      </Text>
                    </Pressable>
                    <Text style={[styles.dash, { color: theme.secondaryText }]}>—</Text>
                    <Pressable
                      onPress={() => setEditing({ weekday, field: 'end' })}
                      style={[styles.timeBtn, { backgroundColor: theme.inputBackground }]}>
                      <Text style={[styles.timeText, { color: theme.primaryText }]}>
                        {intervalTimeString(interval.endHour, interval.endMinute)}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[styles.closed, { color: theme.secondaryText }]}>Closed</Text>
                )}
              </View>
            );
          })}

          <Text style={[styles.info, { color: theme.secondaryText }]}>
            Your working hours shade the schedule and warn you when booking outside them.
          </Text>
        </ScrollView>
      </SafeAreaView>

      <TimeStepperSheet
        visible={editing !== null}
        title={editing?.field === 'start' ? 'Start Time' : 'End Time'}
        accent={Brand.accent}
        hour={editTime.hour}
        minute={editTime.minute}
        isPM={editTime.isPM}
        onChange={(h, m, pm) => editing && setTime(editing.weekday, editing.field, h, m, pm)}
        onClose={() => setEditing(null)}
      />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { borderRadius: 14, paddingHorizontal: 16 },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  dayName: { fontSize: 16, fontWeight: '600' },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  timeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  timeText: { fontSize: 16, fontWeight: '500' },
  dash: { fontSize: 16 },
  closed: { fontSize: 14, paddingBottom: 14 },
  info: { fontSize: 14, paddingHorizontal: 4, paddingTop: 8 },
});
