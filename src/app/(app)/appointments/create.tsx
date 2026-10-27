/**
 * Create Appointment — port of CreateAppointmentView.swift.
 *
 * Faithful to the client / date+time / services / SMS-reminder / notes layout.
 * End time auto-recalculates from the service duration until the user edits it
 * manually (mirroring `endTimeManuallyAdjusted`). Photos are device-local like
 * iOS: picked into the documents folder, then attached (via `local-photos`) to
 * the appointment once the store swaps in its saved backend id.
 */

import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { StaffPickerSheet } from '@/components/sheets/staff-picker-sheet';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { useAppointmentForm } from '@/context/appointment-form';
import { APPOINTMENTS_QUERY_KEY, useAppointments } from '@/context/appointments-store';
import { useStaff } from '@/context/staff-store';
import { useTimeOff } from '@/context/time-off-store';
import { useWorkingHours } from '@/context/working-hours-store';
import { firstBlockingTimeOff } from '@/models/time-off';
import type { StaffMember } from '@/models/staff';
import { withOpacity } from '@/lib/color';
import { choosePhoto, discardPhoto, setPhotos } from '@/lib/local-photos';
import type { Appointment } from '@/models/appointment';
import {
  combineDateTime,
  durationMinutes,
  endTimeString,
  formatDurationLabel,
  formatTimeDisplay,
  formattedDateFull,
  recalcEndTime,
} from '@/lib/appointment-time';
import { defaultReminderMinutes } from '@/lib/appointment-defaults';
import { REMINDERS, reminderLabel } from '@/lib/reminders';
import { priceDisplay } from '@/models/service';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const shortTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * addAppointment is fire-and-forget (optimistic temp id, swapped for the real
 * backend row on success), so photos are attached by watching the appointments
 * cache for the saved row with this client + start time. Gives up after 2 min
 * (e.g. the save failed) and deletes the orphaned files.
 */
function attachPhotosWhenSaved(qc: QueryClient, clientId: string, startISO: string, uris: string[]) {
  const startMs = new Date(startISO).getTime();
  const find = () =>
    (qc.getQueryData<Appointment[]>(APPOINTMENTS_QUERY_KEY) ?? []).find(
      (a) => !a.id.startsWith('optimistic-') && a.clientId === clientId && new Date(a.startTime).getTime() === startMs,
    );
  let done = false;
  const finish = (saved?: Appointment) => {
    if (done) return;
    done = true;
    unsubscribe();
    clearTimeout(timer);
    if (saved) setPhotos('appointment', saved.id, uris).catch(() => {});
    else uris.forEach((u) => discardPhoto(u));
  };
  const unsubscribe = qc.getQueryCache().subscribe(() => {
    const saved = find();
    if (saved) finish(saved);
  });
  const timer = setTimeout(() => finish(find()), 120_000);
}

export default function CreateAppointment() {
  const theme = useAppTheme();
  const router = useRouter();
  const form = useAppointmentForm();
  const { appointments, addAppointment } = useAppointments();
  const qc = useQueryClient();
  const [photos, setPhotoList] = useState<string[]>([]);
  const { staff } = useStaff();
  const { events: timeOffEvents } = useTimeOff();
  const { isWorkingTime } = useWorkingHours();

  const [reminder, setReminder] = useState(defaultReminderMinutes());
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
    const fmtTime = (iso: string) => shortTime.format(new Date(iso));

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
        notes: notes.trim(),
        internalNotes: internalNotes.trim(),
        location: location.trim(),
      });
      if (photos.length) attachPhotosWhenSaved(qc, selectedClient.id, start.toISOString(), photos);
      form.reset();
      router.back();
    };

    // Runs after any working-hours override: hard-block a client double-book,
    // then warn (with override) on a staff double-book. Time-off blocking is
    // deferred to Sync-3 (no TimeOffManager wired into booking yet).
    const afterHours = () => {
      // A client can't be in two places at once — hard block, no override.
      const clientClash = appointments.find(
        (e) =>
          e.clientId === selectedClient.id &&
          e.status !== 'cancelled' &&
          start < new Date(e.endTime) &&
          end > new Date(e.startTime),
      );
      if (clientClash) {
        Alert.alert(
          'Client Unavailable',
          `${selectedClient.name} already has ${clientClash.serviceName} from ${fmtTime(clientClash.startTime)} to ${fmtTime(clientClash.endTime)}. A client can't be booked for two overlapping appointments.`,
        );
        return;
      }

      // Approved time off is non-bookable — hard block (business-wide, or the
      // selected staff member's). Cancel the time off first to override.
      const off = firstBlockingTimeOff(timeOffEvents, start, end, selectedStaff?.id);
      if (off) {
        Alert.alert(
          'Unavailable',
          off.isBusinessWide
            ? `The business is closed for ${off.title} during this time. Cancel the time off first, or pick another slot.`
            : `${off.staffName} is on time off (${off.title}) during this time. Cancel the time off first, or choose a different staff member or slot.`,
        );
        return;
      }

      // Staff double-booking — soft warning the owner can override.
      if (selectedStaff) {
        const conflict = appointments.find(
          (e) =>
            e.staffMemberId === selectedStaff.id &&
            start < new Date(e.endTime) &&
            end > new Date(e.startTime),
        );
        if (conflict) {
          Alert.alert(
            'Staff Scheduling Conflict',
            `${selectedStaff.name} already has an appointment with ${conflict.clientName} from ${fmtTime(conflict.startTime)} to ${fmtTime(conflict.endTime)}. Do you want to double-book this time slot?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Double-book', onPress: commit },
            ],
          );
          return;
        }
      }
      commit();
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
          { text: 'Book Anyway', onPress: afterHours },
        ],
      );
      return;
    }
    afterHours();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.cardBackground, borderColor: theme.divider, borderRadius: theme.isEditorial ? 2 : 18 }]}>
            <Icon name="xmark" size={18} color={theme.secondaryText} />
          </Pressable>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerTitle, theme.display(20)]}>New appointment</Text>
          <Pressable onPress={save} style={[styles.savePill, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 999 }]}>
            <Text numberOfLines={1} style={[styles.saveText, { color: theme.onAccent }]}>Save</Text>
          </Pressable>
        </View>

        <KeyboardAwareForm contentContainerStyle={styles.body}>
          {/* Client */}
          <Section label="Client">
            <Row onPress={() => router.push('/appointments/select-client')}>
              <Icon name="person.fill" size={20} color={theme.accent} />
              {selectedClient ? (
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{selectedClient.name}</Text>
                  <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{selectedClient.phoneNumber}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: theme.accent }]}>Add client</Text>
              )}
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.chevronTint} />
              </View>
            </Row>
          </Section>

          {/* Staff */}
          <Section label="Staff Member">
            <Row onPress={() => setStaffSheet(true)}>
              <Icon name="person.badge.key.fill" size={20} color={theme.accent} />
              {selectedStaff ? (
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{selectedStaff.name}</Text>
                  <Text style={[styles.rowSub, { color: theme.accent }]}>{selectedStaff.role}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: theme.accent }]}>Assign staff member</Text>
              )}
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.chevronTint} />
              </View>
            </Row>
          </Section>

          {/* Date & time */}
          <Section label="Date and time">
            <Pressable
              onPress={() => setDateSheet(true)}
              style={[styles.dateBtn, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : theme.cornerRadius }]}>
              <Icon name="calendar" size={18} color={theme.onAccent} />
              <Text style={[styles.dateText, { color: theme.onAccent }]}>{formattedDateFull(form.appointmentDate)}</Text>
              <View style={styles.flexEnd}>
                <Icon name="chevron.down" size={14} color={withOpacity(theme.onAccent, 0.8)} />
              </View>
            </Pressable>

            <View style={styles.timeRow}>
              <TimeCard label="Start" hour={form.startHour} minute={form.startMinute} isPM={form.startIsPM} onPress={() => setStartSheet(true)} />
              <Icon name="arrow.right" size={16} color={theme.secondaryText} />
              <TimeCard label="End" hour={form.endHour} minute={form.endMinute} isPM={form.endIsPM} onPress={() => setEndSheet(true)} />
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
              <Icon name="tag.fill" size={20} color={theme.accent} />
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
                <Text style={[styles.placeholder, { color: theme.accent }]}>Add services</Text>
              )}
              <Icon name="chevron.right" size={14} color={theme.chevronTint} />
            </Row>

            {selectedService && (selectedService.processingTime > 0 || selectedService.blockTime > 0) ? (
              <View style={[styles.breakdown, { borderColor: theme.divider, backgroundColor: theme.accentSoft, borderRadius: theme.cornerRadius }]}>
                <BreakdownRow color={selectedService.colorHex} label="Appointment" trailing={`${actualDuration} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration)} />
                {selectedService.processingTime > 0 ? (
                  <BreakdownRow color={withOpacity(selectedService.colorHex, 0.6)} label="Processing" tag="(bookable)" tagColor={iOSColors.green} trailing={`+${selectedService.processingTime} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration + selectedService.processingTime)} />
                ) : null}
                {selectedService.blockTime > 0 ? (
                  <BreakdownRow color={theme.tertiaryText} label="Blocked" tag="(unavailable)" tagColor={iOSColors.red} trailing={`+${selectedService.blockTime} min`} ends={endTimeString(form.startHour, form.startMinute, form.startIsPM, actualDuration + selectedService.processingTime + selectedService.blockTime)} />
                ) : null}
                <View style={[styles.breakdownDivider, { backgroundColor: theme.divider }]} />
                <View style={styles.breakdownTotal}>
                  <Icon name="clock.fill" size={12} color={theme.accent} />
                  <Text style={[styles.totalLabel, { color: theme.primaryText }]}>Total slot reserved</Text>
                  <View style={styles.flexEnd}>
                    <Text style={[styles.totalValue, { color: theme.accent }]}>
                      {actualDuration + selectedService.processingTime + selectedService.blockTime} min
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </Section>

          {/* SMS reminder */}
          <Section label="SMS Reminder">
            <View style={[styles.card, styles.reminderRow, theme.card]}>
              <Icon name="bell.fill" size={18} color={hasConsent ? theme.accent : theme.tertiaryText} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: hasConsent ? theme.primaryText : theme.secondaryText }]}>Auto-remind client</Text>
                {hasConsent ? (
                  <Pressable onPress={() => setReminderSheet(true)} style={styles.reminderPick}>
                    <Text style={[styles.reminderValue, { color: theme.accent }]}>{reminderLabel(reminder)}</Text>
                    <Icon name="chevron.up.chevron.down" size={10} color={theme.accent} />
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
            <Row
              onPress={async () => {
                const uri = await choosePhoto({ title: 'Appointment Photo', square: false });
                if (uri) setPhotoList((prev) => [...prev, uri]);
              }}>
              <Icon name="camera.fill" size={18} color={theme.accent} />
              <Text style={[styles.placeholder, { color: theme.accent }]}>
                {photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'} · Add more` : 'Add photos'}
              </Text>
              <View style={styles.flexEnd}>
                <Icon name="chevron.right" size={14} color={theme.chevronTint} />
              </View>
            </Row>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                {photos.map((uri) => (
                  <Pressable
                    key={uri}
                    accessibilityLabel="Photo, tap to remove"
                    onPress={() =>
                      Alert.alert('Remove Photo', undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => {
                            setPhotoList((prev) => prev.filter((p) => p !== uri));
                            discardPhoto(uri);
                          },
                        },
                      ])
                    }>
                    <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: theme.isEditorial ? 2 : 10 }]} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Section>
          <Section label="Location">
            <InputRow icon="mappin.circle.fill" placeholder="Enter address..." value={location} onChangeText={setLocation} />
          </Section>
        </KeyboardAwareForm>
      </SafeAreaView>

      <DatePickerSheet visible={dateSheet} date={form.appointmentDate} onChange={form.setAppointmentDate} onClose={() => setDateSheet(false)} />
      <TimeStepperSheet
        visible={startSheet} title="Start Time"
        hour={form.startHour} minute={form.startMinute} isPM={form.startIsPM}
        onChange={(h, m, pm) => form.setStart(h, m, pm)} onClose={() => setStartSheet(false)}
      />
      <TimeStepperSheet
        visible={endSheet} title="End Time"
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
        serviceId={selectedService?.id}
        start={combineDateTime(form.appointmentDate, form.startHour, form.startMinute, form.startIsPM)}
        end={combineDateTime(form.appointmentDate, form.endHour, form.endMinute, form.endIsPM)}
        appointments={appointments}
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
    <Pressable onPress={onPress} style={[styles.card, styles.row, theme.card]}>
      {children}
    </Pressable>
  );
}

function TimeCard({ label, hour, minute, isPM, onPress }: { label: string; hour: number; minute: number; isPM: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.timeCard, theme.card]}>
      <Text style={[styles.timeLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.timeValueRow}>
        <Text style={theme.display(24, '500')}>{formatTimeDisplay(hour, minute)}</Text>
        <Text style={[styles.timeAmpm, { color: theme.accent }]}>{isPM ? 'PM' : 'AM'}</Text>
      </View>
      <Icon name="clock.fill" size={16} color={theme.accent} />
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
    <View style={[styles.card, styles.row, theme.card]}>
      <Icon name={icon} size={18} color={theme.secondaryText} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.tertiaryText} style={[styles.input, { color: theme.primaryText }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { width: 36, height: 36, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 6 },
  savePill: { paddingHorizontal: 16, paddingVertical: 10 },
  photoRow: { gap: 10, paddingTop: 4 },
  photoThumb: { width: 72, height: 72 },
  saveText: { fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  section: { gap: 12, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '500' },
  card: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 14 },
  placeholder: { fontSize: 16, fontWeight: '500', flex: 1 },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceDot: { width: 12, height: 12, borderRadius: 6 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  dateText: { fontSize: 16, fontWeight: '500', flex: 1 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeCard: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 16 },
  timeLabel: { fontSize: 12, fontWeight: '500' },
  timeValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  timeAmpm: { fontSize: 14, fontWeight: '600' },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  durationText: { fontSize: 14, fontWeight: '500' },
  breakdown: { borderWidth: 1, padding: 16, gap: 10 },
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
  input: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
});
