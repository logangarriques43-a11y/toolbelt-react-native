/**
 * Create Appointment — port of CreateAppointmentView.swift.
 *
 * Faithful to the client / date+time / services / SMS-reminder / notes layout.
 * End time auto-recalculates from the service duration until the user edits it
 * manually (mirroring `endTimeManuallyAdjusted`). Deferred (need managers from
 * later phases): staff assignment + picker, working-hours warning, staff
 * double-book conflict, and appointment photos — rendered inert.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { StaffPickerSheet } from '@/components/sheets/staff-picker-sheet';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { useAppointmentForm } from '@/context/appointment-form';
import { useAppointments } from '@/context/appointments-store';
import { useStaff } from '@/context/staff-store';
import { useWorkingHours } from '@/context/working-hours-store';
import { STAFF_ORANGE, type StaffMember } from '@/models/staff';
import { withOpacity } from '@/lib/color';
import {
  combineDateTime,
  durationMinutes,
  endTimeString,
  formatDurationLabel,
  formatTimeDisplay,
  formattedDateFull,
  recalcEndTime,
} from '@/lib/appointment-time';
import { REMINDERS, reminderLabel } from '@/lib/reminders';
import { priceDisplay } from '@/models/service';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = iOSColors.blue;
const PURPLE = '#B052DE';

export default function CreateAppointment() {
  const theme = useAppTheme();
  const router = useRouter();
  const form = useAppointmentForm();
  const { addAppointment } = useAppointments();
  const { staff } = useStaff();
  const { isWorkingTime } = useWorkingHours();

  const [reminder, setReminder] = useState(1440);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [location, setLocation] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const [dateSheet, setDateSheet] = useState(false);
  const [staffSheet, setStaffSheet] = useState(false);
  const [startSheet, setStartSheet] = useState(false);
  const [endSheet, setEndSheet] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);

  const { selectedClient, selectedService } = form;
  const hasConsent = selectedClient?.smsConsentGiven ?? false;

  // End-time auto-recalculation (mirrors the onChange/recalculateEndTime logic).
  const endAdjusted = useRef(false);
  const prevServiceId = useRef<string | undefined>(selectedService?.id);
  useEffect(() => {
    if (!selectedService) return;
    if (prevServiceId.current !== selectedService.id) {
      prevServiceId.current = selectedService.id;
      endAdjusted.current = false;
    }
    if (!endAdjusted.current) {
      const e = recalcEndTime(selectedService.duration, form.startHour, form.startMinute, form.startIsPM);
      form.setEnd(e.endHour, e.endMinute, e.endIsPM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, form.startHour, form.startMinute, form.startIsPM]);

  // Force reminder off when the client hasn't consented.
  useEffect(() => {
    if (!hasConsent) setReminder(0);
  }, [hasConsent]);

  // Default the staff member to the owner (matches the Swift onAppear).
  useEffect(() => {
    if (!selectedStaff && staff.length) setSelectedStaff(staff.find((s) => s.isOwner) ?? staff[0]);
  }, [staff, selectedStaff]);

  const actualDuration = durationMinutes(
    form.startHour, form.startMinute, form.startIsPM,
    form.endHour, form.endMinute, form.endIsPM,
  );

  const save = () => {
    if (!selectedClient) return Alert.alert('Error', 'Please select a client');
    if (!selectedService) return Alert.alert('Error', 'Please select a service');

    const start = combineDateTime(form.appointmentDate, form.startHour, form.startMinute, form.startIsPM);
    const end = combineDateTime(form.appointmentDate, form.endHour, form.endMinute, form.endIsPM);
    if (end <= start) return Alert.alert('Error', 'End time must be after start time');

    const mins = Math.round((end.getTime() - start.getTime()) / 60000);
    const commit = () => {
      addAppointment({
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phoneNumber,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        serviceColor: selectedService.colorHex,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: mins,
        price: selectedService.price,
        processingTime: selectedService.processingTime,
        blockTime: selectedService.blockTime + selectedClient.clientBlockTime,
        staffMemberId: selectedStaff?.id,
        staffMemberName: selectedStaff?.name,
        reminderMinutesBefore: hasConsent ? reminder : 0,
        status: 'scheduled',
        notes: '',
        internalNotes: '',
        location: '',
      });
      form.reset();
      router.back();
    };

    const outside =
      !isWorkingTime(start, start.getHours(), start.getMinutes()) ||
      !isWorkingTime(end, end.getHours(), end.getMinutes());
    if (outside) {
      Alert.alert(
        'Outside Working Hours',
        'This appointment is scheduled outside of your working hours. Book it anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Book Anyway', onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="xmark" size={18} color={theme.secondaryText} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>New appointment</Text>
          <Pressable onPress={save} style={styles.savePill}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Client */}
          <Section label="Client">
            <Row onPress={() => router.push('/appointments/select-client')}>
              <Icon name="person.fill" size={20} color={BLUE} />
              {selectedClient ? (
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{selectedClient.name}</Text>
                  <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{selectedClient.phoneNumber}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: BLUE }]}>Add client</Text>
              )}
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.secondaryText} />
              </View>
            </Row>
          </Section>

          {/* Staff */}
          <Section label="Staff Member">
            <Row onPress={() => setStaffSheet(true)}>
              <Icon name="person.badge.key.fill" size={20} color={STAFF_ORANGE} />
              {selectedStaff ? (
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{selectedStaff.name}</Text>
                  <Text style={[styles.rowSub, { color: STAFF_ORANGE }]}>{selectedStaff.role}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: STAFF_ORANGE }]}>Assign staff member</Text>
              )}
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.secondaryText} />
              </View>
            </Row>
          </Section>

          {/* Date & time */}
          <Section label="Date and time">
            <Pressable onPress={() => setDateSheet(true)} style={styles.dateBtn}>
              <Icon name="calendar" size={18} color="#FFFFFF" />
              <Text style={styles.dateText}>{formattedDateFull(form.appointmentDate)}</Text>
              <View style={styles.flexEnd}>
                <Icon name="chevron.down" size={14} color="rgba(255,255,255,0.8)" />
              </View>
            </Pressable>

            <View style={styles.timeRow}>
              <TimeCard label="Start" hour={form.startHour} minute={form.startMinute} isPM={form.startIsPM} accent={BLUE} onPress={() => setStartSheet(true)} />
              <Icon name="arrow.right" size={16} color={theme.secondaryText} />
              <TimeCard label="End" hour={form.endHour} minute={form.endMinute} isPM={form.endIsPM} accent={PURPLE} onPress={() => setEndSheet(true)} />
            </View>

            <View style={styles.durationRow}>
              <Icon name="timer" size={14} color={theme.secondaryText} />
              <Text style={[styles.durationText, { color: theme.secondaryText }]}>
                Duration: {formatDurationLabel(actualDuration)}
              </Text>
            </View>
          </Section>

          {/* Services */}
          <Section label="Services">
            <Row onPress={() => router.push('/appointments/select-service')}>
              <Icon name="tag.fill" size={20} color={BLUE} />
              {selectedService ? (
                <>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{selectedService.name}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>
                      {actualDuration} min • ${priceDisplay(selectedService)}
                    </Text>
                  </View>
                  <View style={[styles.serviceDot, { backgroundColor: selectedService.colorHex }]} />
                </>
              ) : (
                <Text style={[styles.placeholder, { color: BLUE }]}>Add services</Text>
              )}
              <Icon name="chevron.right" size={14} color={theme.secondaryText} />
            </Row>

            {selectedService && (selectedService.processingTime > 0 || selectedService.blockTime > 0) ? (
              <View style={[styles.breakdown, { borderColor: withOpacity(BLUE, 0.2), backgroundColor: withOpacity(BLUE, 0.05) }]}>
                <BreakdownRow color={selectedService.colorHex} label="Appointment" trailing={`${actualDuration} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration)} />
                {selectedService.processingTime > 0 ? (
                  <BreakdownRow color={withOpacity(selectedService.colorHex, 0.6)} label="Processing" tag="(bookable)" tagColor={iOSColors.green} trailing={`+${selectedService.processingTime} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration + selectedService.processingTime)} />
                ) : null}
                {selectedService.blockTime > 0 ? (
                  <BreakdownRow color={withOpacity(iOSColors.gray, 0.5)} label="Blocked" tag="(unavailable)" tagColor={iOSColors.red} trailing={`+${selectedService.blockTime} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration + selectedService.processingTime + selectedService.blockTime)} />
                ) : null}
                <View style={[styles.breakdownDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.breakdownTotal}>
                  <Icon name="clock.fill" size={12} color={BLUE} />
                  <Text style={[styles.totalLabel, { color: theme.primaryText }]}>Total slot reserved</Text>
                  <View style={styles.flexEnd}>
                    <Text style={[styles.totalValue, { color: BLUE }]}>
                      {actualDuration + selectedService.processingTime + selectedService.blockTime} min
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </Section>

          {/* SMS reminder */}
          <Section label="SMS Reminder">
            <View style={[styles.card, styles.reminderRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Icon name="bell.fill" size={18} color={hasConsent ? BLUE : iOSColors.gray} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: hasConsent ? theme.primaryText : theme.secondaryText }]}>Auto-remind client</Text>
                {hasConsent ? (
                  <Pressable onPress={() => setReminderSheet(true)} style={styles.reminderPick}>
                    <Text style={[styles.reminderValue, { color: BLUE }]}>{reminderLabel(reminder)}</Text>
                    <Icon name="chevron.up.chevron.down" size={10} color={BLUE} />
                  </Pressable>
                ) : (
                  <Text style={[styles.reminderWarn, { color: iOSColors.orange }]}>
                    Client has not consented to SMS — edit their profile to enable
                  </Text>
                )}
              </View>
              <Icon
                name={hasConsent && reminder > 0 ? 'checkmark.circle.fill' : hasConsent ? 'minus.circle' : 'lock.fill'}
                size={20}
                color={hasConsent && reminder > 0 ? iOSColors.green : theme.secondaryText}
              />
            </View>
          </Section>

          {/* Notes / Location */}
          <Section label="Notes">
            <InputRow icon="doc.text.fill" placeholder="Enter notes..." value={notes} onChangeText={setNotes} />
          </Section>
          <Section label="Internal Notes">
            <InputRow icon="lock.doc.fill" placeholder="Enter internal notes..." value={internalNotes} onChangeText={setInternalNotes} />
          </Section>
          <Section label="Photos">
            <Row onPress={() => Alert.alert('Coming soon', 'Appointment photos arrive with a later phase.')}>
              <Icon name="camera.fill" size={18} color={BLUE} />
              <Text style={[styles.placeholder, { color: BLUE }]}>Add photos</Text>
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.secondaryText} />
              </View>
            </Row>
          </Section>
          <Section label="Location">
            <InputRow icon="mappin.circle.fill" placeholder="Enter address..." value={location} onChangeText={setLocation} />
          </Section>
        </ScrollView>
      </SafeAreaView>

      <DatePickerSheet visible={dateSheet} date={form.appointmentDate} onChange={form.setAppointmentDate} onClose={() => setDateSheet(false)} />
      <TimeStepperSheet
        visible={startSheet} title="Start Time" accent={BLUE}
        hour={form.startHour} minute={form.startMinute} isPM={form.startIsPM}
        onChange={(h, m, pm) => form.setStart(h, m, pm)} onClose={() => setStartSheet(false)}
      />
      <TimeStepperSheet
        visible={endSheet} title="End Time" accent={PURPLE}
        hour={form.endHour} minute={form.endMinute} isPM={form.endIsPM}
        onChange={(h, m, pm) => { endAdjusted.current = true; form.setEnd(h, m, pm); }}
        onClose={() => setEndSheet(false)}
      />
      <OptionSheet
        visible={reminderSheet} title="Reminder" options={REMINDERS} selected={reminder}
        onSelect={setReminder} onClose={() => setReminderSheet(false)}
      />
      <StaffPickerSheet
        visible={staffSheet} staff={staff} selectedId={selectedStaff?.id}
        onSelect={setSelectedStaff} onClose={() => setStaffSheet(false)}
      />
    </DashboardGradient>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      {children}
    </View>
  );
}

function Row({ onPress, children }: { onPress: () => void; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.card, styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      {children}
    </Pressable>
  );
}

function TimeCard({ label, hour, minute, isPM, accent, onPress }: { label: string; hour: number; minute: number; isPM: boolean; accent: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.timeCard, { backgroundColor: theme.cardBackground, borderColor: withOpacity(accent, 0.3) }, lightShadow(theme)]}>
      <Text style={[styles.timeLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.timeValueRow}>
        <Text style={[styles.timeValue, { color: theme.primaryText }]}>{formatTimeDisplay(hour, minute)}</Text>
        <Text style={[styles.timeAmpm, { color: accent }]}>{isPM ? 'PM' : 'AM'}</Text>
      </View>
      <Icon name="clock.fill" size={16} color={withOpacity(accent, 0.6)} />
    </Pressable>
  );
}

function BreakdownRow({ color, label, tag, tagColor, trailing, ends }: { color: string; label: string; tag?: string; tagColor?: string; trailing: string; ends: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: color }]} />
      <Text style={[styles.breakdownLabel, { color: theme.primaryText }]}>{label}</Text>
      {tag ? <Text style={[styles.breakdownTag, { color: tagColor }]}>{tag}</Text> : null}
      <View style={styles.flexEnd}>
        <Text style={[styles.breakdownTrailing, { color: theme.secondaryText }]}>{trailing}</Text>
        <Text style={[styles.breakdownEnds, { color: theme.primaryText }]}>ends {ends}</Text>
      </View>
    </View>
  );
}

function InputRow({ icon, placeholder, value, onChangeText }: { icon: SFSymbol; placeholder: string; value: string; onChangeText: (t: string) => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Icon name={icon} size={18} color={theme.secondaryText} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  savePill: { backgroundColor: BLUE, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  section: { gap: 12, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '500' },
  card: { borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 14 },
  placeholder: { fontSize: 16, fontWeight: '500', flex: 1 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceDot: { width: 12, height: 12, borderRadius: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: BLUE },
  dateText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeCard: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeValue: { fontSize: 24, fontWeight: '700' },
  timeAmpm: { fontSize: 14, fontWeight: '600' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationText: { fontSize: 14, fontWeight: '500' },
  breakdown: { borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownDot: { width: 12, height: 12, borderRadius: 6 },
  breakdownLabel: { fontSize: 14 },
  breakdownTag: { fontSize: 11 },
  breakdownTrailing: { fontSize: 14, fontWeight: '500' },
  breakdownEnds: { fontSize: 14, fontWeight: '600' },
  breakdownDivider: { height: StyleSheet.hairlineWidth },
  breakdownTotal: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  totalLabel: { fontSize: 14, fontWeight: '600' },
  totalValue: { fontSize: 14, fontWeight: '700' },
  reminderRow: { gap: 16 },
  reminderPick: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderValue: { fontSize: 14 },
  reminderWarn: { fontSize: 12 },
  input: { flex: 1, fontSize: 16, padding: 0 },
});
