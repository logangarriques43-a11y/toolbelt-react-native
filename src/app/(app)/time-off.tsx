/**
 * Time Off — port of TimeOffView.swift + TimeOffFormViewModel.swift.
 *
 * A "new personal event" form: title, who's off (a staff member or the whole
 * business), a start date + end date (a later end date makes it an all-day
 * multi-day range), start/end times (single-day), recurrence (frequency +
 * count), color, notes, location — plus a list of existing time off. Saving a
 * recurring event expands it into N linked occurrences (appointment-series
 * pattern), and warns once when the time off would strand existing bookings.
 *
 * Deferred (Sync-1b / follow-ups): the approval inbox + staff-requested
 * (pending) flow and cancellation requests (only meaningful with staff login),
 * the holiday picker, and the on-grid time-off overlay. Owner-created time off
 * here is always `approved`.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';

import {
  BLUE, DateButton, DurationRow, FieldRow, InputRow, PURPLE, Section, TimeCard,
} from '@/components/appointment-bits';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ColorPickerSheet } from '@/components/sheets/color-picker-sheet';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useAppointments } from '@/context/appointments-store';
import { useSession } from '@/context/session';
import { useStaff } from '@/context/staff-store';
import { useTimeOff } from '@/context/time-off-store';
import { uuid } from '@/lib/id';
import {
  combineDateTime, durationMinutes, formatDurationLabel, formattedDateFull,
} from '@/lib/appointment-time';
import {
  appointmentTimeRange, RECURRENCE_FREQUENCIES, recurrenceDisplayName,
  recurrenceOccurrences, type RecurrenceFrequency,
} from '@/models/appointment';
import { appointmentsConflictingWithTimeOff, timeOffIsRecurring } from '@/models/time-off';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Sheet = 'date' | 'endDate' | 'start' | 'end' | 'color' | 'who' | 'recurrence' | null;

const BUSINESS = '__business__';

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function TimeOff() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account } = useSession();
  const { events, addEvent, deleteEvent } = useTimeOff();
  const { staff } = useStaff();
  const { appointments } = useAppointments();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [endDate, setEndDate] = useState(new Date().toISOString());
  const [sH, setSH] = useState(9); const [sM, setSM] = useState(45); const [sPM, setSPM] = useState(false);
  const [eH, setEH] = useState(10); const [eM, setEM] = useState(15); const [ePM, setEPM] = useState(false);
  const [color, setColor] = useState<string>(iOSColors.blue);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  // Who's off: whole business, or a specific staff member.
  const [businessWide, setBusinessWide] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  // Recurrence — nil frequency = one-off.
  const [frequency, setFrequency] = useState<RecurrenceFrequency | null>(null);
  const [count, setCount] = useState(4);
  const [sheet, setSheet] = useState<Sheet>(null);

  const activeStaff = staff.filter((s) => s.isActive);
  const selectedStaff = selectedStaffId ? staff.find((s) => s.id === selectedStaffId) ?? null : null;
  const isMultiDay = !sameCalendarDay(new Date(endDate), new Date(date)) && new Date(endDate) > new Date(date);
  const duration = durationMinutes(sH, sM, sPM, eH, eM, ePM);

  const whoLabel = businessWide ? 'Whole Business' : selectedStaff?.name ?? 'Select staff member';
  const whoOptions = [{ label: 'Whole Business', value: BUSINESS }, ...activeStaff.map((s) => ({ label: s.name, value: s.id }))];
  const recurrenceOptions = [
    { label: 'Does not repeat', value: 'none' },
    ...RECURRENCE_FREQUENCIES.map((f) => ({ label: recurrenceDisplayName(f), value: f })),
  ];

  const save = () => {
    if (!title.trim()) return Alert.alert('Error', 'Please enter a title');
    if (!businessWide && !selectedStaff) {
      return Alert.alert('Error', 'Choose a staff member, or select Whole Business.');
    }

    // Resolve the window: a multi-day range blocks whole days; a single day
    // uses the start/end time pickers.
    let start: Date;
    let end: Date;
    if (isMultiDay) {
      start = new Date(date); start.setHours(0, 0, 0, 0);
      end = new Date(endDate); end.setHours(23, 59, 59, 0);
      if (end <= start) return Alert.alert('Error', 'The end date must be on or after the start date.');
    } else {
      start = combineDateTime(date, sH, sM, sPM);
      end = combineDateTime(date, eH, eM, ePM);
      if (end <= start) return Alert.alert('Error', 'The end time must be after the start time.');
    }

    const staffDisplayName = businessWide ? 'Whole Business' : selectedStaff?.name ?? account?.name ?? 'Staff';
    const durationMs = end.getTime() - start.getTime();

    // Expand a recurring time off into N linked occurrences (one-off = single).
    const groupId = frequency ? uuid() : undefined;
    const starts = frequency ? recurrenceOccurrences(frequency, start, Math.max(1, count)) : [start];
    const draft = starts.map((s) => ({
      title,
      startTime: s.toISOString(),
      endTime: new Date(s.getTime() + durationMs).toISOString(),
      staffName: staffDisplayName,
      staffMemberId: businessWide ? undefined : selectedStaff?.id,
      isBusinessWide: businessWide,
      status: 'approved' as const,
      requestedByStaff: false,
      cancellationRequested: false,
      colorHex: color,
      notes: notes || undefined,
      location: location || undefined,
      isAllDay: isMultiDay,
      recurrenceGroupId: groupId,
      recurrenceFrequency: frequency ?? undefined,
    }));

    const commit = () => {
      draft.forEach(addEvent);
      router.back();
    };

    // Warn once if this approved time off would strand existing appointments
    // (this member's clients, or everyone when business-wide) across the series.
    const conflicts = draft.flatMap((ev) => appointmentsConflictingWithTimeOff(ev, appointments));
    if (conflicts.length > 0) {
      const who = businessWide ? 'the business' : staffDisplayName;
      const names = conflicts.slice(0, 6).map((a) => `• ${a.clientName} — ${appointmentTimeRange(a)}`).join('\n');
      const more = conflicts.length > 6 ? `\n…and ${conflicts.length - 6} more` : '';
      Alert.alert(
        'Conflicts with existing appointments',
        `${conflicts.length} existing appointment${conflicts.length === 1 ? '' : 's'} for ${who} fall inside this time off:\n\n${names}${more}\n\nThose clients will need rescheduling.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.cardBackground }]}>
            <Icon name="xmark" size={16} color={theme.secondaryText} />
          </Pressable>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerTitle, { color: theme.primaryText }]}>New personal event</Text>
          <Pressable onPress={save}>
            <LinearGradient colors={Brand.gradient} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.savePill}>
              <Text numberOfLines={1} style={styles.saveText}>Save</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <Section label="Title">
            <InputRow icon="pencil" placeholder="e.g. Lunch break, Vacation" value={title} onChangeText={setTitle} />
          </Section>

          <Section label="Who's off">
            <FieldRow onPress={() => setSheet('who')}>
              <Icon name={businessWide ? 'building.2.fill' : 'person.fill'} size={20} color={PURPLE} />
              <Text style={[styles.rowLabel, { color: businessWide || selectedStaff ? theme.primaryText : theme.secondaryText }]}>{whoLabel}</Text>
              <View style={styles.flexEnd}><Icon name="chevron.up.chevron.down" size={13} color={theme.secondaryText} /></View>
            </FieldRow>
            <FieldRow onPress={() => setSheet('endDate')}>
              <Icon name="calendar.badge.clock" size={20} color={PURPLE} />
              <Text style={[styles.rowLabel, { color: theme.primaryText }]}>End date</Text>
              <View style={styles.flexEnd}><Text style={[styles.rowValue, { color: theme.secondaryText }]}>{dayFmt.format(new Date(endDate))}</Text></View>
            </FieldRow>
            {isMultiDay ? (
              <Text style={[styles.hint, { color: theme.secondaryText }]}>Blocks all day, every day from the start date through the end date.</Text>
            ) : null}
          </Section>

          <Section label="Start date & time">
            <View style={styles.recurrenceHead}>
              <Pressable onPress={() => setSheet('recurrence')} style={styles.recurrenceBtn}>
                <Icon name="repeat" size={12} color={BLUE} />
                <Text style={styles.recurrenceBtnText}>{frequency ? recurrenceDisplayName(frequency) : '+ Add recurrence'}</Text>
              </Pressable>
            </View>
            {frequency ? (
              <View style={styles.stepperRow}>
                <Text style={[styles.rowValue, { color: theme.secondaryText }]}>
                  Repeats {recurrenceDisplayName(frequency).toLowerCase()} · {count} time{count === 1 ? '' : 's'}
                </Text>
                <View style={styles.flexEnd}>
                  <Pressable onPress={() => setCount((c) => Math.max(1, c - 1))} hitSlop={8} style={[styles.stepBtn, { borderColor: theme.divider }]}>
                    <Icon name="minus" size={14} color={theme.primaryText} />
                  </Pressable>
                  <Pressable onPress={() => setCount((c) => Math.min(52, c + 1))} hitSlop={8} style={[styles.stepBtn, { borderColor: theme.divider }]}>
                    <Icon name="plus" size={14} color={theme.primaryText} />
                  </Pressable>
                </View>
              </View>
            ) : null}
            <DateButton label={formattedDateFull(date)} onPress={() => setSheet('date')} />
            {!isMultiDay ? (
              <>
                <View style={styles.timeRow}>
                  <TimeCard label="Start" hour={sH} minute={sM} isPM={sPM} accent={BLUE} onPress={() => setSheet('start')} />
                  <Icon name="arrow.right" size={16} color={theme.secondaryText} />
                  <TimeCard label="End" hour={eH} minute={eM} isPM={ePM} accent={PURPLE} onPress={() => setSheet('end')} />
                </View>
                <DurationRow label={formatDurationLabel(duration)} />
              </>
            ) : null}
          </Section>

          <Section label="Color">
            <FieldRow onPress={() => setSheet('color')}>
              <View style={[styles.colorDot, { backgroundColor: color }]} />
              <Text style={[styles.colorLabel, { color: theme.primaryText }]}>Selected color</Text>
              <View style={styles.flexEnd}><Icon name="chevron.right" size={14} color={theme.secondaryText} /></View>
            </FieldRow>
          </Section>

          <Section label="Notes">
            <InputRow icon="doc.text.fill" placeholder="Add notes..." value={notes} onChangeText={setNotes} />
          </Section>
          <Section label="Location">
            <InputRow icon="mappin.circle.fill" placeholder="Enter address..." value={location} onChangeText={setLocation} />
          </Section>

          {events.length > 0 ? (
            <Section label="Scheduled Time Off">
              {events.map((ev) => (
                <SwipeToDelete key={ev.id} onDelete={() => deleteEvent(ev.id)}>
                  <View style={[styles.eventCard, { backgroundColor: theme.cardBackground }]}>
                    <View style={[styles.eventBar, { backgroundColor: ev.colorHex }]} />
                    <View style={styles.eventBody}>
                      <View style={styles.eventTitleRow}>
                        <Text style={[styles.eventTitle, { color: theme.primaryText }]}>{ev.title}</Text>
                        {timeOffIsRecurring(ev) ? <Icon name="repeat" size={12} color={theme.secondaryText} /> : null}
                      </View>
                      <Text style={[styles.eventScope, { color: PURPLE }]}>
                        {ev.isBusinessWide ? 'Whole Business' : ev.staffName}
                      </Text>
                      <Text style={[styles.eventTime, { color: theme.secondaryText }]}>
                        {ev.isAllDay
                          ? `${dayFmt.format(new Date(ev.startTime))} – ${dayFmt.format(new Date(ev.endTime))} · All day`
                          : `${formattedDateFull(ev.startTime)} · ${appointmentTimeRange(ev)}`}
                      </Text>
                    </View>
                  </View>
                </SwipeToDelete>
              ))}
            </Section>
          ) : null}
        </KeyboardAwareForm>
      </SafeAreaView>

      <DatePickerSheet visible={sheet === 'date'} date={date} onChange={setDate} onClose={() => setSheet(null)} />
      <DatePickerSheet visible={sheet === 'endDate'} date={endDate} onChange={setEndDate} onClose={() => setSheet(null)} />
      <TimeStepperSheet visible={sheet === 'start'} title="Start Time" accent={BLUE} hour={sH} minute={sM} isPM={sPM} onChange={(h, m, pm) => { setSH(h); setSM(m); setSPM(pm); }} onClose={() => setSheet(null)} />
      <TimeStepperSheet visible={sheet === 'end'} title="End Time" accent={PURPLE} hour={eH} minute={eM} isPM={ePM} onChange={(h, m, pm) => { setEH(h); setEM(m); setEPM(pm); }} onClose={() => setSheet(null)} />
      <ColorPickerSheet visible={sheet === 'color'} selected={color} onSelect={setColor} onClose={() => setSheet(null)} />
      <OptionSheet
        visible={sheet === 'who'}
        title="Who's off"
        options={whoOptions}
        selected={businessWide ? BUSINESS : selectedStaffId ?? ''}
        onSelect={(v) => {
          if (v === BUSINESS) { setBusinessWide(true); setSelectedStaffId(null); }
          else { setBusinessWide(false); setSelectedStaffId(v); }
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'recurrence'}
        title="Recurrence"
        options={recurrenceOptions}
        selected={frequency ?? 'none'}
        onSelect={(v) => setFrequency(v === 'none' ? null : (v as RecurrenceFrequency))}
        onClose={() => setSheet(null)}
      />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 6, fontSize: 17, fontWeight: '700' },
  savePill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  rowLabel: { flex: 1, fontSize: 16 },
  rowValue: { fontSize: 14 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hint: { fontSize: 12, paddingHorizontal: 4 },
  recurrenceHead: { flexDirection: 'row', justifyContent: 'flex-end' },
  recurrenceBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recurrenceBtnText: { color: BLUE, fontSize: 14, fontWeight: '500' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  colorLabel: { flex: 1, fontSize: 16 },
  eventCard: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden' },
  eventBar: { width: 5 },
  eventBody: { flex: 1, padding: 14, gap: 4 },
  eventTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventTitle: { fontSize: 16, fontWeight: '600' },
  eventScope: { fontSize: 13, fontWeight: '500' },
  eventTime: { fontSize: 13 },
});
