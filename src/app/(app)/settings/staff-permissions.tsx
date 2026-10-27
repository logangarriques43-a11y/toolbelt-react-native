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
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useAppTheme } from '@/theme/theme-context';

const PERMISSIONS: { id: string; title: string; subtitle: string; icon: SFSymbol }[] = [
  { id: 'viewClients', title: 'View Clients', subtitle: 'See client list and details', icon: 'person.2.fill' },
  { id: 'editClients', title: 'Edit Clients', subtitle: 'Add, edit, or remove clients', icon: 'person.crop.circle.badge.plus' },
  { id: 'viewAppointments', title: 'View Appointments', subtitle: 'See the schedule and bookings', icon: 'calendar' },
  { id: 'editAppointments', title: 'Edit Appointments', subtitle: 'Create, edit, or cancel appointments', icon: 'calendar.badge.plus' },
  { id: 'viewPayments', title: 'View Payments', subtitle: 'See transaction history', icon: 'creditcard.fill' },
  { id: 'processPayments', title: 'Process Payments', subtitle: 'Charge clients and issue refunds', icon: 'dollarsign.circle.fill' },
  { id: 'viewReports', title: 'View Reports', subtitle: 'Access analytics and reports', icon: 'chart.bar.fill' },
  { id: 'manageInventory', title: 'Manage Inventory', subtitle: 'Add or edit products and stock', icon: 'shippingbox.fill' },
  { id: 'viewInvoices', title: 'View Invoices', subtitle: 'See sent and pending invoices', icon: 'doc.text.fill' },
  { id: 'sendInvoices', title: 'Send Invoices', subtitle: 'Create and send invoices to clients', icon: 'paperplane.fill' },
  { id: 'manageSettings', title: 'Manage Settings', subtitle: 'Change business settings', icon: 'gearshape.fill' },
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
          <ThemedIconTile name="lock.shield.fill" size={72} filled />
          <Text style={[styles.desc, { color: theme.secondaryText }]}>
            Control what non-owner staff members can view and edit.
          </Text>

          <View style={styles.quick}>
            <Pressable onPress={() => setAll(true)} style={[styles.quickBtn, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 999 }]}>
              <Text style={[styles.quickPrimary, { color: theme.onAccent }]}>Enable All</Text>
            </Pressable>
            <Pressable onPress={() => setAll(false)} style={[styles.quickBtn, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 999 }]}>
              <Text style={[styles.quickSecondary, { color: theme.accent }]}>Disable All</Text>
            </Pressable>
          </View>

          <View style={[styles.card, theme.card]}>
            {PERMISSIONS.map((p, i) => (
              <View key={p.id}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <View style={styles.row}>
                  <ThemedIconTile name={p.icon} size={36} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{p.title}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{p.subtitle}</Text>
                  </View>
                  <Switch
                    value={states[p.id]}
                    onValueChange={(v) => setStates((s) => ({ ...s, [p.id]: v }))}
                    trackColor={{ true: theme.accent, false: theme.divider }}
                  />
                </View>
              </View>
            ))}
          </View>

          <ThemedButton title="Save Permissions" onPress={() => router.back()} style={styles.save} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 20, alignItems: 'center', paddingBottom: 40 },
  desc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  quick: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  quickBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  quickPrimary: { fontSize: 14, fontWeight: '600' },
  quickSecondary: { fontSize: 14, fontWeight: '600' },
  card: { alignSelf: 'stretch', overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13 },
  save: { alignSelf: 'stretch' },
});
