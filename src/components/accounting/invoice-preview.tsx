/**
 * InvoicePreview — a clean read-only invoice preview shown from the list/composer.
 * Approximates InvoicePreviewView.swift (the on-device invoice render).
 */

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import {
  invoiceDisplayName, invoiceSubtotal, invoiceTaxAmount, invoiceTotalDue, lineItemTotal, type Invoice,
} from '@/models/invoice';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dueFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });

export function InvoicePreview({
  invoice, businessName, visible, onClose,
}: {
  invoice: Invoice | null; businessName: string; visible: boolean; onClose: () => void;
}) {
  const theme = useAppTheme();
  if (!invoice) return null;

  const subtotal = invoiceSubtotal(invoice);
  const tax = invoiceTaxAmount(invoice);
  const total = invoiceTotalDue(invoice);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Preview</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="xmark.circle.fill" size={26} color={theme.secondaryText} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            <View style={[styles.sheet, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={styles.top}>
                <View>
                  <Text style={[styles.business, { color: theme.primaryText }]}>{businessName}</Text>
                  <Text style={[styles.invNo, { color: theme.secondaryText }]}>{invoiceDisplayName(invoice)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: iOSColors.green }]}>
                  <Text style={styles.badgeText}>INVOICE</Text>
                </View>
              </View>

              {invoice.clientName ? <Row theme={theme} label="Bill To" value={invoice.clientName} /> : null}
              {invoice.emailAddress ? <Row theme={theme} label="Email" value={invoice.emailAddress} /> : null}
              <Row theme={theme} label="Due" value={dueFmt.format(new Date(invoice.dueDate))} />

              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              {invoice.lineItems.map((item) => (
                <View key={item.id} style={styles.item}>
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemName, { color: theme.primaryText }]}>{item.description || 'Item'}</Text>
                    <Text style={[styles.itemQty, { color: theme.secondaryText }]}>{item.quantity} × {usd.format(item.unitPrice)}</Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.primaryText }]}>{usd.format(lineItemTotal(item))}</Text>
                </View>
              ))}

              <View style={[styles.divider, { backgroundColor: theme.divider }]} />

              <TotalRow theme={theme} label="Subtotal" value={usd.format(subtotal)} />
              {invoice.taxRate ? <TotalRow theme={theme} label={`Tax (${invoice.taxRate}%)`} value={usd.format(tax)} /> : null}
              <View style={[styles.totalDue, { backgroundColor: 'rgba(52,199,89,0.08)' }]}>
                <Text style={[styles.totalDueLabel, { color: theme.primaryText }]}>Total Due</Text>
                <Text style={[styles.totalDueValue, { color: iOSColors.green }]}>{usd.format(total)}</Text>
              </View>

              {invoice.message ? <Text style={[styles.message, { color: theme.secondaryText }]}>{invoice.message}</Text> : null}
            </View>
          </ScrollView>
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

function Row({ theme, label, value }: { theme: ReturnType<typeof useAppTheme>; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function TotalRow({ theme, label, value }: { theme: ReturnType<typeof useAppTheme>; label: string; value: string }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.totalValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 40 },
  sheet: { borderRadius: 16, padding: 20, gap: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  business: { fontSize: 20, fontWeight: '700' },
  invNo: { fontSize: 14, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 13, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemBody: { flex: 1, gap: 2 },
  itemName: { fontSize: 15, fontWeight: '500' },
  itemQty: { fontSize: 13 },
  itemTotal: { fontSize: 15, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: '500' },
  totalDue: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 4 },
  totalDueLabel: { fontSize: 16, fontWeight: '700' },
  totalDueValue: { fontSize: 20, fontWeight: '700' },
  message: { fontSize: 14, marginTop: 4 },
});
