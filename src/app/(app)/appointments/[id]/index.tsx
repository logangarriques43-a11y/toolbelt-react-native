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
 * now, matching create/edit. The Resources-Used Track button opens Inventory;
 * Send Message opens the device's SMS app to the client's number (disabled
 * when there is none). Photos are device-local (like iOS): the client avatar
 * shows the client's local photo, and the Photos section lists / adds the
 * appointment's photos via `local-photos`.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { StaffPickerSheet } from '@/components/sheets/staff-picker-sheet';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { usePermissions } from '@/context/permissions-store';
import { useStaff } from '@/context/staff-store';
import { defaultReminderMinutes, setDefaultReminderMinutes } from '@/lib/appointment-defaults';
import { withOpacity } from '@/lib/color';
import { choosePhoto, getPhoto, useLocalPhotos } from '@/lib/local-photos';
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
import { staffColor, staffInitials, type StaffMember } from '@/models/staff';
import { iOSColors } from '@/theme/tokens';
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

  const { clients } = useClients();
  const appt = appointments.find((a) => a.id === id);
  const client = appt ? clients.find((c) => c.id === appt.clientId) : undefined;
  const clientPhone = (appt?.clientPhone || client?.phoneNumber || '').trim();
  const { photos, save: savePhotos } = useLocalPhotos('appointment', appt?.id);
  const [clientPhoto, setClientPhoto] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!appt?.clientId) return;
    getPhoto('client', appt.clientId).then(setClientPhoto);
  }, [appt?.clientId]);

  const messageClient = () => {
    const digits = clientPhone.replace(/[^\d+]/g, '');
    if (!digits) return;
    Linking.openURL(`sms:${digits}`).catch(() =>
      Alert.alert('Could not open Messages', 'This device can’t send text messages.'),
    );
  };

  const addPhoto = async () => {
    const uri = await choosePhoto({ title: 'Appointment Photo', square: false });
    if (uri) await savePhotos([...photos, uri]);
  };

  const removePhoto = (uri: string) =>
    Alert.alert('Remove Photo', 'Remove this photo from the appointment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => savePhotos(photos.filter((p) => p !== uri)) },
    ]);
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
              <View style={[styles.avatar, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 50, overflow: 'hidden' }]}>
                {clientPhoto ? (
                  <Image source={{ uri: clientPhoto }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={[styles.avatarText, { color: theme.onAccent }]}>{clientInitials(appt.clientName)}</Text>
                )}
              </View>
              <Text style={theme.display(28)}>{appt.clientName}</Text>
              <View style={styles.metaLine}>
                <Icon name="calendar" size={16} color={theme.accent} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>
                  {detailDateFmt.format(new Date(appt.startTime))}
                </Text>
              </View>
              <View style={styles.metaLine}>
                <Icon name="clock" size={16} color={theme.accent} />
                <Text style={[styles.metaText, { color: theme.secondaryText }]}>{appointmentTimeRange(appt)}</Text>
              </View>
            </View>

            {/* Status pills — mark Scheduled / Completed / Cancelled / No-show */}
            <View style={styles.section}>
              <Text style={theme.display(20)}>Status</Text>
              <View style={styles.statusGrid}>
                {APPOINTMENT_STATUSES.map((s) => (
                  <StatusPill key={s} status={s} active={appt.status === s} onPress={() => setStatus(s)} />
                ))}
              </View>
            </View>

            {/* Assigned staff — tap to reassign */}
            <View style={styles.section}>
              <Text style={theme.display(20)}>Assigned Staff</Text>
              <Pressable
                onPress={() => { if (canEditStaff) setStaffSheet(true); }}
                disabled={!canEditStaff}
                style={[styles.staffCard, theme.card]}>
                {assignedStaff ? (
                  <View style={[styles.staffAvatar, { backgroundColor: staffColor(assignedStaff) || theme.accent }]}>
                    <Text style={[styles.staffAvatarText, { color: staffColor(assignedStaff) ? '#FFFFFF' : theme.onAccent }]}>
                      {staffInitials(assignedStaff.name)}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.staffAvatar, { backgroundColor: theme.inputBackground }]}>
                    <Text style={[styles.staffAvatarText, { color: theme.secondaryText }]}>—</Text>
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
                <Icon name="person.badge.key.fill" size={20} color={assignedStaff ? theme.accent : theme.secondaryText} />
                {canEditStaff ? <Icon name="chevron.right" size={14} color={theme.chevronTint} /> : null}
              </Pressable>
            </View>

            {/* Service */}
            <View style={styles.section}>
              <Text style={theme.display(20)}>Service Details</Text>
              <View style={[styles.serviceCard, theme.card]}>
                <View style={[styles.serviceDot, { backgroundColor: appt.serviceColor }]} />
                <View style={styles.serviceBody}>
                  <Text style={theme.display(20, '500')}>{appt.serviceName}</Text>
                  <View style={styles.metaLine}>
                    <Icon name="clock.fill" size={12} color={theme.secondaryText} />
                    <Text style={[styles.metaText, { color: theme.secondaryText }]}>{appt.duration} minutes</Text>
                  </View>
                </View>
                <Text style={[theme.display(24, '500'), { color: theme.accent }]}>${appt.price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Info cards */}
            <View style={styles.infoCards}>
              <InfoCard
                icon="bell.fill"
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
                  title="Repeats"
                  subtitle={recurrenceDisplayName(appt.recurrenceFrequency)}
                  chevron={false}
                />
              ) : null}

              <InfoCard
                icon={statusIcon(appt.status)}
                title="Status"
                subtitle={statusDisplayName(appt.status)}
                onPress={() => setStatusSheet(true)}
              />
            </View>

            {/* Details — notes / internal notes / location (shown only if present) */}
            <NotesSection appointment={appt} />

            {/* Photos (device-local) */}
            <View style={styles.section}>
              <View style={styles.resourceHead}>
                <Text style={theme.display(20)}>Photos</Text>
                <Pressable onPress={addPhoto} style={styles.trackBtn} hitSlop={8}>
                  <Icon name="plus.circle.fill" size={14} color={theme.accent} />
                  <Text style={[styles.trackText, { color: theme.accent }]}>Add</Text>
                </Pressable>
              </View>
              {photos.length === 0 ? (
                <Pressable onPress={addPhoto} style={[styles.resourceEmpty, theme.card]}>
                  <ThemedIconTile name="camera.fill" size={44} />
                  <View style={styles.resourceText}>
                    <Text style={[styles.resourceTitle, { color: theme.primaryText }]}>No photos yet</Text>
                    <Text style={[styles.resourceSub, { color: theme.secondaryText }]}>Before / after shots stay on this device</Text>
                  </View>
                </Pressable>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {photos.map((uri) => (
                    <Pressable key={uri} onPress={() => removePhoto(uri)} accessibilityLabel="Photo, tap to remove">
                      <Image source={{ uri }} style={[styles.photoThumb, { borderRadius: theme.isEditorial ? 2 : 12 }]} contentFit="cover" />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Resources — tracked from Inventory */}
            <View style={styles.section}>
              <View style={styles.resourceHead}>
                <Text style={theme.display(20)}>Resources Used</Text>
                <Pressable
                  onPress={() => router.push('/inventory')}
                  style={styles.trackBtn}>
                  <Icon name="plus.circle.fill" size={14} color={theme.accent} />
                  <Text style={[styles.trackText, { color: theme.accent }]}>Track</Text>
                </Pressable>
              </View>
              <View style={[styles.resourceEmpty, theme.card]}>
                <ThemedIconTile name="shippingbox" size={44} />
                <View style={styles.resourceText}>
                  <Text style={[styles.resourceTitle, { color: theme.primaryText }]}>No resources tracked</Text>
                  <Text style={[styles.resourceSub, { color: theme.secondaryText }]}>Tap Track to log inventory used in Inventory</Text>
                </View>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ThemedButton
                title="Checkout"
                icon="creditcard.fill"
                kind="inverse"
                onPress={() => router.push(`/appointments/${appt.id}/checkout`)}
              />

              <OutlineBtn icon="calendar.badge.clock" label="Reschedule" onPress={() => router.push(`/appointments/${appt.id}/edit`)} />
              <ThemedButton
                title={clientPhone ? 'Send Message to Client' : 'No phone number on file'}
                icon="message.fill"
                kind="quiet"
                disabled={!clientPhone}
                onPress={messageClient}
              />
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
  const theme = useAppTheme();
  // Scheduled uses the look's accent; completed / cancelled / no-show keep their semantic colours.
  const isAccent = status === 'scheduled';
  const tint = isAccent ? theme.accent : statusTint(status);
  const fg = isAccent ? theme.onAccent : '#FFFFFF';
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statusPill,
        {
          backgroundColor: active ? tint : withOpacity(tint, 0.1),
          borderColor: active ? 'transparent' : withOpacity(tint, 0.25),
          borderRadius: theme.isEditorial ? 2 : 999,
        },
      ]}>
      <Icon name={statusIcon(status)} size={14} color={active ? fg : tint} />
      <Text style={[styles.statusPillText, { color: active ? fg : tint }]}>{statusDisplayName(status)}</Text>
      {active ? <Icon name="checkmark" size={12} color={fg} /> : null}
    </Pressable>
  );
}

type DetailRow = { icon: SFSymbol; title: string; value: string };

function NotesSection({ appointment }: { appointment: Appointment }) {
  const theme = useAppTheme();
  const rows: DetailRow[] = [];
  if (appointment.notes) rows.push({ icon: 'doc.text.fill', title: 'Notes', value: appointment.notes });
  if (appointment.internalNotes) rows.push({ icon: 'lock.doc.fill', title: 'Internal Notes', value: appointment.internalNotes });
  if (appointment.location) rows.push({ icon: 'mappin.circle.fill', title: 'Location', value: appointment.location });

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={theme.display(20)}>Details</Text>
      {rows.map((r) => (
        <View key={r.title} style={[styles.detailRow, theme.card]}>
          <Icon name={r.icon} size={18} color={theme.accent} />
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
  title,
  subtitle,
  onPress,
  chevron = true,
}: {
  icon: SFSymbol;
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
      style={[styles.infoCard, theme.card]}>
      <ThemedIconTile name={icon} size={44} />
      <View style={styles.infoText}>
        <Text style={[styles.infoTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.infoSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      {chevron ? <Icon name="chevron.right" size={14} color={theme.chevronTint} /> : null}
    </Pressable>
  );
}

function OutlineBtn({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return <ThemedButton title={label} icon={icon} kind="quiet" onPress={onPress} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 18 },
  body: { paddingBottom: 40, gap: 24 },
  clientBlock: { alignItems: 'center', gap: 12, paddingTop: 32 },
  avatar: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '600' },
  avatarImage: { width: 100, height: 100 },
  photoRow: { gap: 10 },
  photoThumb: { width: 96, height: 96 },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaText: { fontSize: 16, fontWeight: '500' },
  section: { gap: 16, paddingHorizontal: 20 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  serviceDot: { width: 50, height: 50, borderRadius: 25 },
  serviceBody: { flex: 1, gap: 6 },
  infoCards: { gap: 12, paddingHorizontal: 20 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  infoText: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 16, fontWeight: '600' },
  infoSub: { fontSize: 14 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  defaultText: { fontSize: 13 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statusPill: { flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  statusPillText: { fontSize: 14, fontWeight: '600', flex: 1 },
  staffCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20 },
  staffAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  staffAvatarText: { fontSize: 20, fontWeight: '600' },
  staffText: { flex: 1, gap: 4 },
  staffName: { fontSize: 18, fontWeight: '600' },
  staffSub: { fontSize: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 12 },
  detailText: { flex: 1, gap: 4 },
  detailTitle: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 15 },
  resourceHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackText: { fontSize: 14, fontWeight: '600' },
  resourceEmpty: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12 },
  resourceText: { flex: 1, gap: 4 },
  resourceTitle: { fontSize: 15, fontWeight: '500' },
  resourceSub: { fontSize: 13 },
  actions: { gap: 12, paddingHorizontal: 20 },

});
