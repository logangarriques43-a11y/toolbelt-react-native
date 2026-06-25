/**
 * Edit Appointment — port of EditAppointmentView.swift.
 * Client is read-only; service is re-selectable (round-trips through the shared
 * select-service screen, consumed on focus). End time auto-recalcs from the
 * chosen service's duration until manually edited. Staff + working-hours
 * warnings deferred (need managers from later phases).
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BLUE, DateButton, DurationRow, FieldRow, PURPLE, Section, ServiceBreakdown, TimeCard,
} from '@/components/appointment-bits';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { StaffPickerSheet } from '@/components/sheets/staff-picker-sheet';
import { TimeStepperSheet } from '@/components/sheets/time-stepper-sheet';
import { useAppointmentForm } from '@/context/appointment-form';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { useServices } from '@/context/services-store';
import { useStaff } from '@/context/staff-store';
import { useWorkingHours } from '@/context/working-hours-store';
import { STAFF_ORANGE, type StaffMember } from '@/models/staff';
import {
  combineDateTime, durationMinutes, formatDurationLabel, formattedDateFull, recalcEndTime,
} from '@/lib/appointment-time';
import { REMINDERS, reminderLabel } from '@/lib/reminders';
import { priceDisplay, type Service } from '@/models/service';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

function to12(date: Date) {
  const h24 = date.getHours();
  return {
    hour: h24 > 12 ? h24 - 12 : h24 === 0 ? 12 : h24,
    minute: date.getMinutes(),
    isPM: h24 >= 12,
  };
}

export default function EditAppointment() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, updateAppointment } = useAppointments();
  const { clients } = useClients();
  const { findService } = useServices();
  const { staff } = useStaff();
  const { isWorkingTime } = useWorkingHours();
  const form = useAppointmentForm();

  const appt = useMemo(() => appointments.find((a) => a.id === id), [appointments, id]);

  const initial = useMemo(() => {
    if (!appt) return null;
    const start = to12(new Date(appt.startTime));
    const end = to12(new Date(appt.endTime));
    const service: Service =
      findService(appt.serviceId) ?? {
        id: appt.serviceId,
        name: appt.serviceName,
        colorHex: appt.serviceColor,
        price: appt.price,
        duration: appt.duration,
        priceType: 'Fixed',
        processingTime: appt.processingTime,
        blockTime: appt.blockTime,
        noDoubleBooking: false,
        availableForOnlineBooking: true,
      };
    return { start, end, service, date: appt.startTime, reminder: appt.reminderMinutesBefore };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appt?.id]);

  const [service, setService] = useState<Service | null>(initial?.service ?? null);
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString());
  const [sH, setSH] = useState(initial?.start.hour ?? 9);
  const [sM, setSM] = useState(initial?.start.minute ?? 0);
  const [sPM, setSPM] = useState(initial?.start.isPM ?? false);
  const [eH, setEH] = useState(initial?.end.hour ?? 10);
  const [eM, setEM] = useState(initial?.end.minute ?? 0);
  const [ePM, setEPM] = useState(initial?.end.isPM ?? false);
  const [reminder, setReminder] = useState(initial?.reminder ?? 1440);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(
    () => (appt?.staffMemberId ? staff.find((s) => s.id === appt.staffMemberId) ?? null : null),
  );

  const [dateSheet, setDateSheet] = useState(false);
  const [startSheet, setStartSheet] = useState(false);
  const [endSheet, setEndSheet] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);
  const [staffSheet, setStaffSheet] = useState(false);

  const endAdjusted = useRef(false);
  const awaitingService = useRef(false);
  const didMount = useRef(false);

  // Recalc end from service duration on start/service change (skip first mount).
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (!service || endAdjusted.current) return;
    const e = recalcEndTime(service.duration, sH, sM, sPM);
    setEH(e.endHour); setEM(e.endMinute); setEPM(e.endIsPM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id, sH, sM, sPM]);

  // Consume a re-selected service when returning from select-service.
  useFocusEffect(
    useCallback(() => {
      if (awaitingService.current && form.selectedService) {
        setService(form.selectedService);
        endAdjusted.current = false;
        form.setSelectedService(null);
        awaitingService.current = false;
      }
    }, [form]),
  );

  const actualDuration = durationMinutes(sH, sM, sPM, eH, eM, ePM);

  const save = () => {
    if (!appt || !service) return Alert.alert('Error', 'Please select a service');
    const start = combineDateTime(date, sH, sM, sPM);
    const end = combineDateTime(date, eH, eM, ePM);
    if (end <= start) return Alert.alert('Error', 'End time must be after start time');

    const clientBlock = clients.find((c) => c.id === appt.clientId)?.clientBlockTime ?? 0;
    const commit = () => {
      updateAppointment({
        ...appt,
        serviceId: service.id,
        serviceName: service.name,
        serviceColor: service.colorHex,
        price: service.price,
        processingTime: service.processingTime,
        blockTime: service.blockTime + clientBlock,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        duration: Math.round((end.getTime() - start.getTime()) / 60000),
        reminderMinutesBefore: reminder,
        staffMemberId: selectedStaff?.id,
        staffMemberName: selectedStaff?.name,
      });
      router.back();
    };

    const outside =
      !isWorkingTime(start, start.getHours(), start.getMinutes()) ||
      !isWorkingTime(end, end.getHours(), end.getMinutes());
    if (outside) {
      Alert.alert(
        'Outside Working Hours',
        'This appointment is scheduled outside of your working hours. Save it anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: commit },
        ],
      );
      return;
    }
    commit();
  };

  if (!appt) {
    return (
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.missing}>
            <Text style={{ color: theme.secondaryText }}>Appointment not found</Text>
          </View>
        </SafeAreaView>
      </DashboardGradient>
    );
  }

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={[styles.closeBtn, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="xmark" size={18} color={theme.secondaryText} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Edit appointment</Text>
          <Pressable onPress={save} style={styles.savePill}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Client (read-only) */}
          <Section label="Client">
            <View style={[styles.readonlyCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Icon name="person.fill" size={20} color={iOSColors.blue} />
              <View style={styles.readonlyText}>
                <Text style={[styles.clientName, { color: theme.primaryText }]}>{appt.clientName}</Text>
                <Text style={[styles.clientSub, { color: theme.secondaryText }]}>Client cannot be changed</Text>
              </View>
            </View>
          </Section>

          {/* Staff */}
          <Section label="Staff Member">
            <FieldRow onPress={() => setStaffSheet(true)}>
              <Icon name="person.badge.key.fill" size={20} color={STAFF_ORANGE} />
              {selectedStaff ? (
                <View style={styles.serviceText}>
                  <Text style={[styles.serviceName, { color: theme.primaryText }]}>{selectedStaff.name}</Text>
                  <Text style={[styles.serviceSub, { color: STAFF_ORANGE }]}>{selectedStaff.role}</Text>
                </View>
              ) : (
                <Text style={[styles.placeholder, { color: STAFF_ORANGE }]}>Select staff member</Text>
              )}
              <View style={styles.flexEnd}><Icon name="chevron.right" size={14} color={theme.secondaryText} /></View>
            </FieldRow>
          </Section>

          {/* Date & time */}
          <Section label="Date and time">
            <DateButton label={formattedDateFull(date)} onPress={() => setDateSheet(true)} />
            <View style={styles.timeRow}>
              <TimeCard label="Start" hour={sH} minute={sM} isPM={sPM} accent={BLUE} onPress={() => setStartSheet(true)} />
              <Icon name="arrow.right" size={16} color={theme.secondaryText} />
              <TimeCard label="End" hour={eH} minute={eM} isPM={ePM} accent={PURPLE} onPress={() => setEndSheet(true)} />
            </View>
            <DurationRow label={formatDurationLabel(actualDuration)} />
          </Section>

          {/* Services */}
          <Section label="Services">
            <FieldRow onPress={() => { awaitingService.current = true; router.push('/appointments/select-service'); }}>
              <Icon name="tag.fill" size={20} color={BLUE} />
              {service ? (
                <>
                  <View style={styles.serviceText}>
                    <Text style={[styles.serviceName, { color: theme.primaryText }]}>{service.name}</Text>
                    <Text style={[styles.serviceSub, { color: theme.secondaryText }]}>
                      {actualDuration} min • ${priceDisplay(service)}
                    </Text>
                  </View>
                  <View style={[styles.serviceDot, { backgroundColor: service.colorHex }]} />
                </>
              ) : (
                <Text style={[styles.placeholder, { color: BLUE }]}>Select service</Text>
              )}
              <Icon name="chevron.right" size={14} color={theme.secondaryText} />
            </FieldRow>
            {service ? (
              <ServiceBreakdown service={service} actualDuration={actualDuration} startHour={sH} startMinute={sM} startIsPM={sPM} />
            ) : null}
          </Section>

          {/* SMS reminder */}
          <Section label="SMS Reminder">
            <View style={[styles.card, styles.reminderRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Icon name="bell.fill" size={18} color={BLUE} />
              <View style={styles.reminderText}>
                <Text style={[styles.reminderTitle, { color: theme.primaryText }]}>Auto-remind client</Text>
                <Pressable onPress={() => setReminderSheet(true)} style={styles.reminderPick}>
                  <Text style={[styles.reminderValue, { color: BLUE }]}>{reminderLabel(reminder)}</Text>
                  <Icon name="chevron.up.chevron.down" size={10} color={BLUE} />
                </Pressable>
              </View>
              <Icon name={reminder > 0 ? 'checkmark.circle.fill' : 'minus.circle'} size={20} color={reminder > 0 ? iOSColors.green : theme.secondaryText} />
            </View>
          </Section>
        </ScrollView>
      </SafeAreaView>

      <DatePickerSheet visible={dateSheet} date={date} onChange={setDate} onClose={() => setDateSheet(false)} />
      <TimeStepperSheet visible={startSheet} title="Start Time" accent={BLUE} hour={sH} minute={sM} isPM={sPM} onChange={(h, m, pm) => { setSH(h); setSM(m); setSPM(pm); }} onClose={() => setStartSheet(false)} />
      <TimeStepperSheet visible={endSheet} title="End Time" accent={PURPLE} hour={eH} minute={eM} isPM={ePM} onChange={(h, m, pm) => { endAdjusted.current = true; setEH(h); setEM(m); setEPM(pm); }} onClose={() => setEndSheet(false)} />
      <OptionSheet visible={reminderSheet} title="Reminder" options={REMINDERS} selected={reminder} onSelect={setReminder} onClose={() => setReminderSheet(false)} />
      <StaffPickerSheet visible={staffSheet} staff={staff} selectedId={selectedStaff?.id} onSelect={setSelectedStaff} onClose={() => setStaffSheet(false)} />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  savePill: { backgroundColor: iOSColors.blue, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingTop: 24, paddingBottom: 60, gap: 24 },
  readonlyCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 12, padding: 16 },
  readonlyText: { flex: 1, gap: 4 },
  clientName: { fontSize: 16, fontWeight: '500' },
  clientSub: { fontSize: 12 },
  placeholder: { flex: 1, fontSize: 16, fontWeight: '500' },
  flexEnd: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderRadius: 12, padding: 16 },
  serviceText: { flex: 1, gap: 4 },
  serviceName: { fontSize: 16, fontWeight: '500' },
  serviceSub: { fontSize: 14 },
  serviceDot: { width: 12, height: 12, borderRadius: 6 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reminderText: { flex: 1, gap: 4 },
  reminderTitle: { fontSize: 16, fontWeight: '500' },
  reminderPick: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderValue: { fontSize: 14 },
});
