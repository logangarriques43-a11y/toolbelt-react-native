/**
 * Schedule — port of ScheduleView.swift. Replaces the Phase 2b temporary list.
 *
 * View modes (switch via the header's settings button): Day (time grid),
 * Schedule (agenda list), Month (calendar overview). Week / 3-Day grids are
 * deferred (2c-iii) and disabled in the switcher. Hamburger menu, full calendar
 * settings panel, AI assistant, and working-hours shading are deferred (2d).
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { FloatingActionMenu } from '@/components/schedule/floating-action-menu';
import { HamburgerMenu } from '@/components/schedule/hamburger-menu';
import { Icon } from '@/components/icon';
import { MonthGrid } from '@/components/schedule/month-grid';
import { MultiDayGrid } from '@/components/schedule/multi-day-grid';
import { ScheduleHeader } from '@/components/schedule/schedule-header';
import { ScheduleListView } from '@/components/schedule/schedule-list';
import { SingleDayGrid } from '@/components/schedule/single-day-grid';
import { ViewSwitcherSheet, type ScheduleViewType } from '@/components/schedule/view-switcher-sheet';
import { useAppointments } from '@/context/appointments-store';
import { useStaff } from '@/context/staff-store';
import { withOpacity } from '@/lib/color';
import { TIME_COL_WIDTH, addDays, isToday } from '@/lib/schedule-layout';
import type { Appointment } from '@/models/appointment';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const dayNumFmt = new Intl.DateTimeFormat('en-US', { day: 'numeric' });
const dayNameFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const monthFmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

const weekDates = (d: Date) => {
  const start = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};
const threeDayDates = (d: Date) => Array.from({ length: 3 }, (_, i) => addDays(d, i));

export default function Schedule() {
  const theme = useAppTheme();
  const router = useRouter();
  const { appointments, getAppointments } = useAppointments();
  const { staff } = useStaff();

  const [viewType, setViewType] = useState<ScheduleViewType>('day');
  const [displayedDate, setDisplayedDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Calendar staff filter: null = all staff. Shading/tinting follow the pick.
  const selectedStaff = selectedStaffId ? staff.find((m) => m.id === selectedStaffId) ?? null : null;
  const byStaff = (a: Appointment) => !selectedStaffId || a.staffMemberId === selectedStaffId;
  const staffAppointments = appointments.filter(byStaff);
  const dayAppointments = (date: Date) => getAppointments(date).filter(byStaff);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const today = isToday(displayedDate);
  const openDetail = (a: Appointment) => router.push(`/appointments/${a.id}`);
  const stub = (what: string) => Alert.alert('Coming soon', `${what} arrives in a later phase.`);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScheduleHeader
          displayedDate={displayedDate}
          onDateChange={setDisplayedDate}
          appointments={appointments}
          onHome={() => router.back()}
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onMenu={() => setMenuOpen(true)}
        />

        {viewType === 'day' ? (
          <>
            <View style={[styles.dayHeader, { backgroundColor: today ? withOpacity(iOSColors.blue, 0.1) : 'transparent' }]}>
              <View style={styles.clockCol}>
                <Icon name="clock" size={16} color={theme.secondaryText} />
              </View>
              <View style={[styles.dayInfo, { borderLeftColor: theme.divider }]}>
                <Text style={[styles.dayNum, { color: today ? iOSColors.blue : theme.primaryText }]}>{dayNumFmt.format(displayedDate)}</Text>
                <Text style={[styles.dayName, { color: today ? iOSColors.blue : theme.secondaryText }]}>{dayNameFmt.format(displayedDate)}</Text>
                <Text style={[styles.dot, { color: theme.secondaryText }]}>•</Text>
                <Text style={[styles.month, { color: theme.secondaryText }]}>{monthFmt.format(displayedDate)}</Text>
              </View>
            </View>
            <View style={styles.gridArea}>
              <SingleDayGrid
                date={displayedDate}
                appointments={dayAppointments(displayedDate)}
                currentTime={currentTime}
                onAppointmentPress={openDetail}
                onSwipe={(dir) => setDisplayedDate((d) => addDays(d, dir))}
                selectedStaff={selectedStaff}
                staff={staff}
              />
            </View>
          </>
        ) : viewType === 'schedule' ? (
          <View style={styles.gridArea}>
            <ScheduleListView selectedDate={displayedDate} appointments={staffAppointments} onAppointmentPress={openDetail} />
          </View>
        ) : viewType === 'month' ? (
          <View style={styles.gridArea}>
            <MonthGrid
              month={displayedDate}
              appointments={staffAppointments}
              onMonthChange={(delta) => setDisplayedDate((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1))}
              onDayTap={(date) => { setDisplayedDate(date); setViewType('day'); }}
              onAppointmentPress={openDetail}
            />
          </View>
        ) : (
          <View style={styles.gridArea}>
            <MultiDayGrid
              dates={viewType === 'week' ? weekDates(displayedDate) : threeDayDates(displayedDate)}
              getAppointments={dayAppointments}
              currentTime={currentTime}
              onAppointmentPress={openDetail}
              onSwipe={(dir) => setDisplayedDate((d) => addDays(d, dir * (viewType === 'week' ? 7 : 3)))}
              selectedStaff={selectedStaff}
              staff={staff}
            />
          </View>
        )}

        {/* Today button (all calendar views) */}
        {!today && viewType !== 'schedule' ? (
          <Pressable onPress={() => setDisplayedDate(new Date())} style={styles.todayBtn}>
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        ) : null}

        <FloatingActionMenu
          onCreateAppointment={() => router.push('/appointments/create')}
          onTimeOff={() => router.push('/time-off')}
          onInvoice={() => stub('Invoicing')}
        />

        <HamburgerMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      </SafeAreaView>

      <ViewSwitcherSheet
        visible={switcherOpen}
        selected={viewType}
        onSelect={setViewType}
        onClose={() => setSwitcherOpen(false)}
        onWorkingHours={() => router.push('/working-hours')}
        staff={staff}
        selectedStaffId={selectedStaffId}
        onSelectStaff={setSelectedStaffId}
      />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  dayHeader: { flexDirection: 'row', height: 60 },
  clockCol: { width: TIME_COL_WIDTH, alignItems: 'center', justifyContent: 'center' },
  dayInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, borderLeftWidth: 1 },
  dayNum: { fontSize: 20, fontWeight: '700' },
  dayName: { fontSize: 16, fontWeight: '500' },
  dot: { fontSize: 14 },
  month: { fontSize: 14 },
  gridArea: { flex: 1 },
  todayBtn: {
    position: 'absolute', left: 20, bottom: 30,
    backgroundColor: iOSColors.blue, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  todayText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
