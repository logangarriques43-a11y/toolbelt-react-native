/**
 * Export Data — port of ExportDataView.swift.
 * Pick a format + which data to export, then share the generated file contents.
 * Clients/Appointments/Services come from the in-memory stores; Invoices and
 * Transactions are empty until their phases (Phase 4/5).
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { useServices } from '@/context/services-store';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type DataType = 'clients' | 'appointments' | 'services' | 'invoices' | 'transactions';
const TYPES: { id: DataType; title: string; icon: SFSymbol; color: string }[] = [
  { id: 'clients', title: 'Clients', icon: 'person.2.fill', color: iOSColors.blue },
  { id: 'appointments', title: 'Appointments', icon: 'calendar', color: iOSColors.orange },
  { id: 'services', title: 'Services', icon: 'list.clipboard.fill', color: iOSColors.purple },
  { id: 'invoices', title: 'Invoices', icon: 'doc.text.fill', color: iOSColors.indigo },
  { id: 'transactions', title: 'Transactions', icon: 'creditcard.fill', color: iOSColors.green },
];

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

export default function ExportData() {
  const theme = useAppTheme();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { services } = useServices();

  const [format, setFormat] = useState<'CSV' | 'JSON'>('CSV');
  const [selected, setSelected] = useState<Set<DataType>>(new Set(TYPES.map((t) => t.id)));

  const data: Record<DataType, Record<string, unknown>[]> = {
    clients: clients.map((c) => ({ name: c.name, phone: c.phoneNumber, email: c.email ?? '', location: c.location ?? '' })),
    appointments: appointments.map((a) => ({ client: a.clientName, service: a.serviceName, start: a.startTime, end: a.endTime, price: a.price })),
    services: services.map((s) => ({ name: s.name, price: s.price, duration: s.duration, type: s.priceType })),
    invoices: [],
    transactions: [],
  };

  const count = (t: DataType) => data[t].length;
  const toggle = (t: DataType) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  const allSelected = selected.size === TYPES.length;

  const exportData = async () => {
    const chosen = TYPES.filter((t) => selected.has(t.id));
    if (chosen.length === 0) return Alert.alert('Nothing selected', 'Choose at least one data type to export.');

    let content: string;
    if (format === 'JSON') {
      content = JSON.stringify(Object.fromEntries(chosen.map((t) => [t.id, data[t.id]])), null, 2);
    } else {
      content = chosen.map((t) => `# ${t.title}\n${toCSV(data[t.id])}`).join('\n\n');
    }
    try {
      await Share.share({ title: `ToolBelt Export (${format})`, message: content });
    } catch {
      Alert.alert('Export failed', 'Could not open the share sheet.');
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Export Data" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(iOSColors.blue) }]}>
            <Icon name="square.and.arrow.up.fill" size={30} color={iOSColors.blue} />
          </View>
          <Text style={[styles.desc, { color: theme.secondaryText }]}>
            Choose what to export and in which format. The file will be ready to save or share.
          </Text>

          <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>FORMAT</Text>
          <View style={[styles.segmented, { backgroundColor: theme.inputBackground }]}>
            {(['CSV', 'JSON'] as const).map((f) => (
              <Pressable key={f} onPress={() => setFormat(f)} style={[styles.segment, format === f ? { backgroundColor: theme.cardBackground } : null]}>
                <Text style={[styles.segmentText, { color: format === f ? theme.primaryText : theme.secondaryText }]}>{f}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dataHead}>
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>DATA TO EXPORT</Text>
            <Pressable onPress={() => setSelected(allSelected ? new Set() : new Set(TYPES.map((t) => t.id)))}>
              <Text style={[styles.selectAll, { color: iOSColors.blue }]}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
            </Pressable>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            {TYPES.map((t, i) => (
              <View key={t.id}>
                {i > 0 ? <View style={[styles.divider, { backgroundColor: theme.divider }]} /> : null}
                <Pressable onPress={() => toggle(t.id)} style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: theme.iconBackground(t.color) }]}>
                    <Icon name={t.icon} size={15} color={t.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, { color: theme.primaryText }]}>{t.title}</Text>
                    <Text style={[styles.rowSub, { color: theme.secondaryText }]}>{count(t.id)} record{count(t.id) === 1 ? '' : 's'}</Text>
                  </View>
                  <Icon
                    name={selected.has(t.id) ? 'checkmark.circle.fill' : 'circle'}
                    size={20}
                    color={selected.has(t.id) ? iOSColors.blue : theme.secondaryText}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          <Pressable onPress={exportData} style={[styles.save, { backgroundColor: iOSColors.blue }]}>
            <Icon name="square.and.arrow.up" size={16} color="#FFFFFF" />
            <Text style={styles.saveText}>Export</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 16, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 10, gap: 3, alignSelf: 'stretch' },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '500' },
  dataHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch' },
  selectAll: { fontSize: 13, fontWeight: '500' },
  card: { alignSelf: 'stretch', borderRadius: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  iconTile: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13 },
  save: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14, marginTop: 4 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
