/**
 * InvoiceRow — port of InvoiceRow (InvoiceListView.swift).
 */

import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { ThemedIconTile } from '@/components/themed';
import { withOpacity } from '@/lib/color';
import { invoiceDisplayName, invoiceTotalDue, type Invoice, type InvoiceStatus } from '@/models/invoice';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dueFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function statusColor(status: InvoiceStatus, accent: string = iOSColors.blue, muted: string = iOSColors.gray): string {
  switch (status) {
    case 'paid': return iOSColors.green;
    case 'sent': return accent;
    case 'cancelled': return iOSColors.red;
    default: return muted;
  }
}

function statusIcon(status: InvoiceStatus): SFSymbol {
  switch (status) {
    case 'paid': return 'checkmark.circle.fill';
    case 'sent': return 'paperplane.fill';
    case 'cancelled': return 'xmark.circle.fill';
    default: return 'doc.text.fill';
  }
}

export function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const theme = useAppTheme();
  const color = statusColor(invoice.status, theme.accent, theme.secondaryText);
  return (
    <View style={[styles.row, theme.card]}>
      <ThemedIconTile name={statusIcon(invoice.status)} size={44} />
      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>{invoiceDisplayName(invoice)}</Text>
        {invoice.clientName ? <Text style={[styles.client, { color: theme.secondaryText }]} numberOfLines={1}>{invoice.clientName}</Text> : null}
        <Text style={[styles.due, { color: theme.tertiaryText }]}>Due {dueFmt.format(new Date(invoice.dueDate))}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.total, { color: theme.primaryText }]}>{usd.format(invoiceTotalDue(invoice))}</Text>
        <Text style={[styles.badge, { color, backgroundColor: withOpacity(color, 0.12) }]}>
          {invoice.status[0].toUpperCase() + invoice.status.slice(1)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  client: { fontSize: 14 },
  due: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 6 },
  total: { fontSize: 16, fontWeight: '700' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
