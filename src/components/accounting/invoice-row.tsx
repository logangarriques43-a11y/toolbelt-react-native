/**
 * InvoiceRow — port of InvoiceRow (InvoiceListView.swift).
 */

import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { invoiceDisplayName, invoiceTotalDue, type Invoice, type InvoiceStatus } from '@/models/invoice';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dueFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function statusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'paid': return iOSColors.green;
    case 'sent': return iOSColors.blue;
    case 'cancelled': return iOSColors.red;
    default: return iOSColors.gray;
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
  const color = statusColor(invoice.status);
  return (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.iconCircle, { backgroundColor: withOpacity(color, 0.12) }]}>
        <Icon name={statusIcon(invoice.status)} size={18} color={color} />
      </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '600' },
  client: { fontSize: 14 },
  due: { fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 6 },
  total: { fontSize: 16, fontWeight: '700' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
