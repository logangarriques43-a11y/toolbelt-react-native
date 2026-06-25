/**
 * Invoices — port of InvoiceListView.swift.
 * Search + status filter + swipe-to-delete; tap a row to preview. Sending by
 * email/text (native composers + Stripe payment links) is deferred — the
 * composer's "Send" marks an invoice sent and shares its summary.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoiceRow } from '@/components/accounting/invoice-row';
import { InvoicePreview } from '@/components/accounting/invoice-preview';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useInvoices } from '@/context/invoices-store';
import { useSession } from '@/context/session';
import { invoiceDisplayName, type Invoice, type InvoiceStatus } from '@/models/invoice';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
];

export default function Invoices() {
  const theme = useAppTheme();
  const router = useRouter();
  const { invoices, deleteInvoice } = useInvoices();
  const { account } = useSession();
  const businessName = account?.businessName || 'Your Business';

  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Invoice | null>(null);

  let filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((i) => invoiceDisplayName(i).toLowerCase().includes(q) || (i.clientName ?? '').toLowerCase().includes(q));
  }
  filtered = [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Invoices"
          right={
            <Pressable onPress={() => router.push('/accounting/create-invoice')} hitSlop={8}>
              <Icon name="plus" size={20} weight="semibold" color={iOSColors.blue} />
            </Pressable>
          }
        />

        <View style={styles.controls}>
          <View style={[styles.search, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search invoices..." placeholderTextColor={theme.tertiaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {FILTERS.map((f) => (
              <Pressable key={f.value} onPress={() => setFilter(f.value)} style={[styles.pill, { borderColor: iOSColors.blue, backgroundColor: filter === f.value ? iOSColors.blue : theme.cardBackground }]}>
                <Text style={[styles.pillText, { color: filter === f.value ? '#FFFFFF' : iOSColors.blue }]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="doc.text.magnifyingglass" size={50} color={theme.tertiaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>{search ? 'No results found' : 'No invoices yet'}</Text>
            {!search && filter === 'all' ? (
              <Pressable onPress={() => router.push('/accounting/create-invoice')} style={[styles.createBtn, { backgroundColor: iOSColors.blue }]}>
                <Text style={styles.createText}>Create your first invoice</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.map((inv) => (
              <SwipeToDelete key={inv.id} onDelete={() => deleteInvoice(inv.id)}>
                <Pressable onPress={() => setPreview(inv)}>
                  <InvoiceRow invoice={inv} />
                </Pressable>
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <InvoicePreview invoice={preview} businessName={businessName} visible={preview !== null} onClose={() => setPreview(null)} />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  controls: { gap: 12, paddingTop: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 16, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  pills: { gap: 10, paddingHorizontal: 16 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 14, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { fontSize: 18, fontWeight: '500' },
  createBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  createText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
});
