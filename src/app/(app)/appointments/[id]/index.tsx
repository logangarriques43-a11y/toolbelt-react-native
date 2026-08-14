/**
 * Appointment Detail — port of AppointmentDetailView.swift.
 * Reached by tapping an appointment. Checkout / Reschedule / delete from here.
 *
 * Sync-2c-i additions (match current Swift source): a Status pill grid
 * (Scheduled / Completed / Cancelled / No-show), an Assigned Staff card that
 * reassigns via StaffPickerSheet, a tappable Reminder card that also sets the
 * default for new appointments, a conditional Recurrence card, and a Details
 * (notes / internal notes / location) section. Staff-reassignment permission
 * gating (`.editAppointments`) is deferred to Sync-1b — anyone may reassign for
 * now, matching create/edit. The Resources-Used (inventory) section shows its
 * empty state with an inert Track button; Send Message is a stub.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { StaffPickerSheet } from '@/components/sheets/staff-picker-sheet';
import { useAppointments } from '@/context/appointments-store';
import { usePermissions } from '@/context/permissions-store';
import { useStaff } from '@/context/staff-store';
import { defaultReminderMinutes, setDefaultReminderMinutes } from '@/lib/appointment-defaults';
import { withOpacity } from '@/lib/color';
import { REMINDERS, reminderLabel } from '@/lib/reminders';
import {
  APPOINTMENT_STATUSES,
  appointmentTimeRange,
  isRecurring,
  recurrenceDisplayName,
  statusDisplayName,
  statusIcon,
  statusTint,
  type Appointment,
  type AppointmentStatus,
} from '@/models/appointment';
import { clientInitials } from '@/models/client';
import { staffColor, staffInitials, STAFF_ORANGE, type StaffMember } from '@/models/staff';
import { Radius, cardShadow, iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const STATUS_OPTIONS = APPOINTMENT_STATUSES.map((s) => ({ label: statusDisplayName(s), value: s }));

const detailDateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
});

export default function AppointmentDetail() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, updateAppointment, deleteAppointment } = useAppointments();
  const { staff } = useStaff();
  const { can } = usePermissions();
  const canEditStaff = can('editAppointments');

  const appt = appointments.find((a) => a.id === id);
  const assignedStaff = appt?.staffMemberId ? staff.find((s) => s.id === appt.staffMemberId) ?? null : null;

  const [staffSheet, setStaffSheet] = useState(false);
  const [reminderSheet, setReminderSheet] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  // Optimistic writes — flip the local model and push it through updateAppointment.
  const setStatus = (status: AppointmentStatus) => {
    if (appt) updateAppointment({ ...appt, status });
  };
  const applyReassign = (picked: StaffMember) => {
    if (appt && picked.id !== appt.staffMemberId) {
      updateAppointment({ ...appt, staffMemberId: picked.id, staffMemberName: picked.name });
    }
  };
  const setReminder = (minutes: number) => {
    if (appt) updateAppointment({ ...appt, reminderMinutesBefore: minutes });
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete Appointment',
      'Are you sure you want to delete this appointment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (appt) deleteAppointment(appt.id);
            router.back();
          },
        },
      ],
    );

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Appointment"
          right={
            appt ? (
              <Pressable onPress={confirmDelete} hitSlop={8}>
                <Icon name="trash" size={18} color={iOSColors.red} />
              </Pressable>
            ) : undefined
          }
        />

        {!appt ? (
          <View style={styles.empty}>
            <Icon name="calendar.badge.exclamationmark" size={60} color={theme.tertiaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No appointment selected</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.body}>
            {/* Client header */}
            <View style={styles.clientBlock}>
              <LinearGradient
                colors={[iOSColors.blue, iOSColors.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}>
                <Text style={styles.avatarText}>{clientInitials(appt.clientName)}</Text>
              </LinearGradient>
              <Text style={[styles.clientName, { color: theme.primaryText }]}>{appt.clientName}</Text>
              <View style={styles.metaLine}>
                <Icon name="calendar" size={16} color={iOSColors.blue} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                  {detailDateFmt.format(new Date(appt.startTime))}
                </Text>
              </View>
              <View style={styles.metaLine}>
                <Icon name="clock" size={16} color={iOSColors.blue} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>{appointmentTimeRange(appt)}</Text>
              </View>
            </View>

            {/* Status pills — mark Scheduled / Completed / Cancelled / No-show */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Status</Text>
              <View style={styles.statusGrid}>
                {APPOINTMENT_STATUSES.map((s) => (
                  <StatusPill key={s} status={s} active={appt.status === s} onPress={() => setStatus(s)} />
                ))}
              </View>
            </View>

            {/* Assigned staff — tap to reassign */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Assigned Staff</Text>
              <Pressable
                onPress={() => { if (canEditStaff) setStaffSheet(true); }}
                disabled={!canEditStaff}
                style={[styles.staffCard, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
                {assignedStaff ? (
                  <View style={[styles.staffAvatar, { backgroundColor: staffColor(assignedStaff) || STAFF_ORANGE }]}>
                    <Text style={styles.staffAvatarText}>{staffInitials(assignedStaff.name)}</Text>
                  </View>
                ) : (
                  <View style={[styles.staffAvatar, { backgroundColor: withOpacity(theme.secondaryText, 0.3) }]}>
                    <Text style={styles.staffAvatarText}>—</Text>
                  </View>
                )}
                <View style={styles.staffText}>
                  <Text style={[styles.staffName, { color: assignedStaff ? theme.primaryText : theme.secondaryText }]}>
                    {assignedStaff ? assignedStaff.name : 'Unassigned'}
                  </Text>
                  <Text style={[styles.staffSub, { color: theme.secondaryText }]}>
                    {assignedStaff
                      ? (canEditStaff ? 'Tap to change' : 'Staff Member')
                      : (canEditStaff ? 'Tap to assign someone' : 'Unassigned')}
                  </Text>
                </View>
                <Icon name="person.badge.key.fill" size={20} color={assignedStaff ? STAFF_ORANGE : theme.secondaryText} />
                {canEditStaff ? <Icon name="chevron.right" size={14} color={theme.secondaryText} /> : null}
              </Pressable>
            </View>

            {/* Service */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Service Details</Text>
              <View style={[styles.serviceCard, { backgroundColor: theme.cardBackground }, cardShadow(theme)]}>
                <View style={[styles.serviceDot, { backgroundColor: appt.serviceColor, shadowColor: appt.serviceColor }]} />
                <View style={styles.serviceBody}>
                  <Text style={[styles.serviceName, { color: theme.primaryText }]}>{appt.serviceName}</Text>
                  <View style={styles.metaLine}>
                    <Icon name="clock.fill" size={12} color={theme.secondaryText} />
                    <Text style={[styles.metaText, { color: theme.secondaryText }]}>{appt.duration} minutes</Text>
                  </View>
                </View>
                <Text style={[styles.servicePrice, { color: iOSColors.blue }]}>${appt.price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Info cards */}
            <View style={styles.infoCards}>
              <InfoCard
                icon="bell.fill"
                color={iOSColors.orange}
                title="Reminder"
                subtitle={appt.reminderMinutesBefore === 0 ? 'No reminder' : reminderLabel(appt.reminderMinutesBefore)}
                onPress={() => setReminderSheet(true)}
              />
              <Pressable
                onPress={() => setDefaultReminderMinutes(appt.reminderMinutesBefore)}
                style={styles.defaultRow}>
                <Icon
                  name="checkmark.circle"
                  size={14}
                  color={defaultReminderMinutes() === appt.reminderMinutesBefore ? iOSColors.green : theme.secondaryText}
                />
                <Text style={[styles.defaultText, { color: theme.secondaryText }]}>
                  {defaultReminderMinutes() === appt.reminderMinutesBefore
                    ? 'Default for new appointments'
                    : 'Set as default for new appointments'}
                </Text>
              </Pressable>

              {appt.recurrenceFrequency ? (
                <InfoCard
                  icon="repeat"
                  color={iOSColors.purple}
                  title="Repeats"
                  subtitle={recurrenceDisplayName(appt.recurrenceFrequency)}
                  chevron={false}
                />
              ) : null}

              <InfoCard
                icon={statusIcon(appt.status)}
                color={statusTint(appt.status)}
                title="Status"
                subtitle={statusDisplayName(appt.status)}
                onPress={() => setStatusSheet(true)}
              />
            </View>

            {/* Details — notes / internal notes / location (shown only if present) */}
            <NotesSection appointment={appt} />

            {/* Resources (deferred) */}
            <View style={styles.section}>
              <View style={styles.resourceHead}>
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Resources Used</Text>
                <Pressable
                  onPress={() => Alert.alert('Coming soon', 'Inventory resource tracking arrives in a later phase.')}
                  style={styles.trackBtn}>
                  <Icon name="plus.circle.fill" size={14} color="#6680F2" />
                  <Text style={styles.trackText}>Track</Text>
                </Pressable>
              </View>
              <View style={[styles.resourceEmpty, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <View style={[styles.resourceIcon, { backgroundColor: withOpacity(iOSColors.purple, 0.12) }]}>
                  <Icon name="shippingbox" size={20} color={iOSColors.purple} />
                </View>
                <View style={styles.resourceText}>
                  <Text style={[styles.resourceTitle, { color: theme.primaryText }]}>No resources tracked</Text>
                  <Text style={[styles.resourceSub, { color: theme.secondaryText }]}>Tap Track to log inventory used</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <Pressable onPress={() => router.push(`/appointments/${appt.id}/checkout`)}>
                <LinearGradient
                  colors={[iOSColors.blue, iOSColors.purple]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryBtn}>
                  <Icon name="creditcard.fill" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryText}>Checkout</Text>
                </LinearGradient>
              </Pressable>

              <OutlineBtn icon="calendar.badge.clock" label="Reschedule" onPress={() => router.push(`/appointments/${appt.id}/edit`)} />
              <OutlineBtn icon="message.fill" label="Send Message to Client" onPress={() => Alert.alert('Coming soon', 'Messaging arrives with the Messages phase.')} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>

      {appt ? (
        <>
          <StaffPickerSheet
            visible={staffSheet}
            staff={staff}
            selectedId={assignedStaff?.id}
            onSelect={applyReassign}
            onClose={() => setStaffSheet(false)}
            serviceId={appt.serviceId}
            start={new Date(appt.startTime)}
            end={new Date(appt.endTime)}
            appointments={appointments}
            excludeAppointmentId={appt.id}
          />
          <OptionSheet
            visible={reminderSheet}
            title="Reminder"
            options={REMINDERS}
            selected={appt.reminderMinutesBefore}
            onSelect={setReminder}
            onClose={() => setReminderSheet(false)}
          />
          <OptionSheet
            visible={statusSheet}
            title="Status"
            options={STATUS_OPTIONS}
            selected={appt.status}
            onSelect={setStatus}
            onClose={() => setStatusSheet(false)}
          />
        </>
      ) : null}
    </DashboardGradient>
  );
}

function StatusPill({ status, active, onPress }: { status: AppointmentStatus; active: boolean; onPress: () => void }) {
  const tint = statusTint(status);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusPill,
        {
          backgroundColor: active ? tint : withOpacity(tint, 0.1),
          borderColor: active ? 'transparent' : withOpacity(tint, 0.25),
        },
      ]}>
      <Icon name={statusIcon(status)} size={14} color={active ? '#FFFFFF' : tint} />
      <Text style={[styles.statusPillText, { color: active ? '#FFFFFF' : tint }]}>{statusDisplayName(status)}</Text>
      {active ? <Icon name="checkmark" size={12} color="#FFFFFF" /> : null}
    </Pressable>
  );
}

type DetailRow = { icon: SFSymbol; color: string; title: string; value: string };

function NotesSection({ appointment }: { appointment: Appointment }) {
  const theme = useAppTheme();
  const rows: DetailRow[] = [];
  if (appointment.notes) rows.push({ icon: 'doc.text.fill', color: iOSColors.blue, title: 'Notes', value: appointment.notes });
  if (appointment.internalNotes) rows.push({ icon: 'lock.doc.fill', color: iOSColors.gray, title: 'Internal Notes', value: appointment.internalNotes });
  if (appointment.location) rows.push({ icon: 'mappin.circle.fill', color: iOSColors.red, title: 'Location', value: appointment.location });

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Details</Text>
      {rows.map((r) => (
        <View key={r.title} style={[styles.detailRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
          <Icon name={r.icon} size={18} color={r.color} />
          <View style={styles.detailText}>
            <Text style={[styles.detailTitle, { color: theme.secondaryText }]}>{r.title}</Text>
            <Text style={[styles.detailValue, { color: theme.primaryText }]}>{r.value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function InfoCard({
  icon,
  color,
  title,
  subtitle,
  onPress,
  chevron = true,
}: {
  icon: SFSymbol;
  color: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  chevron?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.infoCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.infoIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.infoSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      {chevron ? <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} /> : null}
    </Pressable>
  );
}

function OutlineBtn({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.outlineBtn, { backgroundColor: theme.cardBackground, borderColor: iOSColors.blue }, lightShadow(theme)]}>
      <Icon name={icon} size={18} color={iOSColors.blue} />
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 18 },
  body: { paddingBottom: 40, gap: 24 },
  clientBlock: { alignItems: 'center', gap: 12, paddingTop: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', shadowColor: iOSColors.blue, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '600' },
  clientName: { fontSize: 28, fontWeight: '700' },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaText: { fontSize: 16, fontWeight: '500' },
  section: { gap: 16, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: Radius.card },
  serviceDot: { width: 50, height: 50, borderRadius: 25, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  serviceBody: { flex: 1, gap: 6 },
  serviceName: { fontSize: 20, fontWeight: '600' },
  servicePrice: { fontSize: 24, fontWeight: '700' },
  infoCards: { gap: 12, paddingHorizontal: 20 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  infoIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  infoSub: { fontSize: 14 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  defaultText: { fontSize: 13 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusPill: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  statusPillText: { fontSize: 14, fontWeight: '600', flex: 1 },
  staffCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: Radius.card },
  staffAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  staffText: { flex: 1, gap: 4 },
  staffName: { fontSize: 18, fontWeight: '600' },
  staffSub: { fontSize: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 12 },
  detailText: { flex: 1, gap: 4 },
  detailTitle: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 15 },
  resourceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackText: { color: '#6680F2', fontSize: 14, fontWeight: '600' },
  resourceEmpty: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12 },
  resourceIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  resourceText: { flex: 1, gap: 4 },
  resourceTitle: { fontSize: 15, fontWeight: '500' },
  resourceSub: { fontSize: 13 },
  actions: { gap: 12, paddingHorizontal: 20 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, borderWidth: 2 },
  outlineText: { color: iOSColors.blue, fontSize: 16, fontWeight: '600' },
});
