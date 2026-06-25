/**
 * Staff Permissions — port of StaffPermissionsView.swift.
 * Per-capability toggles for non-owner staff (default on). Local state for now.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const STAFF_ORANGE = '#F29933';

const PERMISSIONS: { id: string; title: string; subtitle: string; icon: SFSymbol; color: string }[] = [
  { id: 'viewClients', title: 'View Clients', subtitle: 'See client list and details', icon: 'person.2.fill', color: iOSColors.blue },
  { id: 'editClients', title: 'Edit Clients', subtitle: 'Add, edit, or remove clients', icon: 'person.crop.circle.badge.plus', color: iOSColors.blue },
  { id: 'viewAppointments', title: 'View Appointments', subtitle: 'See the schedule and bookings', icon: 'calendar', color: iOSColors.orange },
  { id: 'editAppointments', title: 'Edit Appointments', subtitle: 'Create, edit, or cancel appointments', icon: 'calendar.badge.plus', color: iOSColors.orange },
  { id: 'viewPayments', title: 'View Payments', subtitle: 'See transaction history', icon: 'creditcard.fill', color: iOSColors.green },
  { id: 'processPayments', title: 'Process Payments', subtitle: 'Charge clients and issue refunds', icon: 'dollarsign.circle.fill', color: iOSColors.green },
  { id: 'viewReports', title: 'View Reports', subtitle: 'Access analytics and reports', icon: 'chart.bar.fill', color: iOSColors.purple },
  { id: 'manageInventory', title: 'Manage Inventory', subtitle: 'Add or edit products and stock', icon: 'shippingbox.fill', color: iOSColors.brown },
  { id: 'viewInvoices', title: 'View Invoices', subtitle: 'See sent and pending invoices', icon: 'doc.text.fill', color: iOSColors.indigo },
  { id: 'sendInvoices', title: 'Send Invoices', subtitle: 'Create and send invoices to clients', icon: 'paperplane.fill', color: iOSColors.indigo },
  { id: 'manageSettings', title: 'Manage Settings', subtitle: 'Change business settings', icon: 'gearshape.fill', color: iOSColors.gray },
];

export default function StaffPermissions() {
  const theme = useAppTheme();
  const router = useRouter();
  const [states, setStates] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.id, true])),
  );

  const setAll = (v: boolean) => setStates(Object.fromEntries(PERMISSIONS.map((p) => [p.id, v])));

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Staff Permissions" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(STAFF_ORANGE) }]}>
            <Icon name="lock.shield.fill" size={30} color={STAFF_ORANGE} />
          </View>
          <Text style={[styles.desc, { color: theme.secondaryText }]}>
            Control what non-owner staff members can view and edit.
          </Text>

          <View style={styles.quick}>
            <Pressable onPress={() => setAll(true)} style={[styles.quickBtn, { backgroundColor: STAFF_ORANGE }]}>
              <Text style={styles.quickPrimary}>Enable All</Text>
            </Pressable>
            <Pressable onPress={() => setAll(false)} style={[styles.quickBtn, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.quickSecondary, { color: STAFF_ORANGE }]}>Disable All</Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            {PERMISSIONS.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <View style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(p.color) }]}>
                    <Icon name={p.icon} size={15} color={p.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{p.title}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{p.subtitle}</Text>
                  </View>
                  <Switch
                    value={states[p.id]}
                    onValueChange={(v) => setStates((s) => ({ ...s, [p.id]: v }))}
                    trackColor={{ true: STAFF_ORANGE, false: theme.divider }}
                  />
                </View>
              </View>
            ))}
          </View>

          <Pressable onPress={() => router.back()} style={[styles.save, { backgroundColor: STAFF_ORANGE }]}>
            <Text style={styles.saveText}>Save Permissions</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 20, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  quick: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  quickPrimary: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  quickSecondary: { fontSize: 14, fontWeight: '600' },
  card: { alignSelf: 'stretch', borderRadius: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13 },
  save: { alignSelf: 'stretch', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
