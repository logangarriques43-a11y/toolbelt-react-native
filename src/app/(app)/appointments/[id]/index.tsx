/**
 * Appointment Detail — port of AppointmentDetailView.swift.
 * Reached by tapping an appointment. Checkout / Reschedule / delete from here.
 * The Resources-Used (inventory) section is deferred to Phase 6 — shows the
 * empty state with an inert Track button. Send Message is a stub.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAppointments } from '@/context/appointments-store';
import { withOpacity } from '@/lib/color';
import { reminderLabel } from '@/lib/reminders';
import { appointmentTimeRange } from '@/models/appointment';
import { clientInitials } from '@/models/client';
import { Radius, cardShadow, iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const detailDateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
});

export default function AppointmentDetail() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments, deleteAppointment } = useAppointments();

  const appt = appointments.find((a) => a.id === id);

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
              <InfoCard icon="bell.fill" color={iOSColors.orange} title="Reminder" subtitle={reminderLabel(appt.reminderMinutesBefore)} />
              <InfoCard icon="checkmark.circle.fill" color={iOSColors.green} title="Status" subtitle="Confirmed" />
            </View>

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
    </DashboardGradient>
  );
}

function InfoCard({ icon, color, title, subtitle }: { icon: SFSymbol; color: string; title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.infoIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <View style={styles.infoText}>
        <Text style={[styles.infoTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.infoSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} />
    </View>
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
  avatarText: { color: '#FFFFFF', fontSize: 36, fontWeight: '700' },
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
