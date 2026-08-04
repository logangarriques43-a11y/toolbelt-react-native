/**
 * Create Invoice — port of CreateInvoiceView.swift (+ CreateInvoiceViewModel).
 * Build a draft invoice: name, client, line items, tax, due date, message, email.
 * "Save as Draft" / "Send" persist it; native email/SMS composers + Stripe
 * payment links are deferred, so "Send" marks it sent and shares the summary.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InvoicePreview } from '@/components/accounting/invoice-preview';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { useClients } from '@/context/clients-store';
import { useInvoices } from '@/context/invoices-store';
import { useSession } from '@/context/session';
import { withOpacity } from '@/lib/color';
import { uuid } from '@/lib/id';
import type { Client } from '@/models/client';
import {
  invoiceDisplayName, invoiceSubtotal, invoiceTaxAmount, invoiceTotalDue, lineItemTotal,
  type Invoice, type InvoiceLineItem, type InvoiceStatus,
} from '@/models/invoice';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function plus30(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

export default function CreateInvoice() {
  const theme = useAppTheme();
  const router = useRouter();
  const { nextInvoiceNumber, addInvoice } = useInvoices();
  const { clients } = useClients();
  const { account } = useSession();

  const [invoiceName, setInvoiceName] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [taxRate, setTaxRate] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(plus30());
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [notifyWhenPaid, setNotifyWhenPaid] = useState(true);

  const [addItem, setAddItem] = useState(false);
  const [taxSheet, setTaxSheet] = useState(false);
  const [dateSheet, setDateSheet] = useState(false);
  const [clientSheet, setClientSheet] = useState(false);
  const [preview, setPreview] = useState(false);

  const draft = { invoiceName, invoiceNumber: nextInvoiceNumber, lineItems, taxRate: taxRate ?? undefined };
  const subtotal = invoiceSubtotal(draft);
  const tax = invoiceTaxAmount(draft);
  const total = invoiceTotalDue(draft);
  const displayName = invoiceDisplayName(draft);
  const businessName = account?.businessName || 'Your Business';

  const build = (status: InvoiceStatus): Omit<Invoice, 'id' | 'createdAt'> => ({
    invoiceNumber: nextInvoiceNumber,
    invoiceName: invoiceName.trim() || undefined,
    clientId: client?.id,
    clientName: client?.name,
    lineItems,
    taxRate: taxRate ?? undefined,
    dueDate,
    message: message.trim() || undefined,
    emailAddress: email.trim(),
    notifyWhenPaid,
    status,
  });

  const previewInvoice: Invoice = { ...build('draft'), id: 'preview', createdAt: new Date().toISOString() };

  const saveDraft = () => {
    if (lineItems.length === 0) return Alert.alert('Add a line item', 'Please add at least one line item.');
    addInvoice(build('draft'));
    router.back();
  };

  const send = async () => {
    if (lineItems.length === 0) return Alert.alert('Add a line item', 'Please add at least one line item.');
    addInvoice(build('sent'));
    const summary = [
      `${displayName} — ${businessName}`,
      client?.name ? `Bill to: ${client.name}` : '',
      ...lineItems.map((i) => `${i.quantity} × ${i.description || 'Item'} — ${usd.format(lineItemTotal(i))}`),
      `Total due: ${usd.format(total)}`,
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ title: displayName, message: summary });
    } catch {
      // cancelled
    }
    router.back();
  };

  const onSend = () => {
    if (lineItems.length === 0) return Alert.alert('Add a line item', 'Please add at least one line item.');
    Alert.alert('Send invoice', undefined, [
      { text: 'Send (Share link)', onPress: send },
      { text: 'Save as Draft', onPress: saveDraft },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickClient = (c: Client) => {
    setClient(c);
    if (c.email) setEmail(c.email);
    setClientSheet(false);
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} hitSlop={8}>
            <Icon name="xmark" size={18} color={theme.secondaryText} />
          </Pressable>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerTitle, { color: theme.primaryText }]}>New invoice</Text>
          <Pressable onPress={onSend} style={[styles.sendBtn, { backgroundColor: lineItems.length === 0 ? iOSColors.gray : iOSColors.blue }]}>
            <Text numberOfLines={1} style={styles.sendText}>Send</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Invoice number badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: withOpacity(iOSColors.green, 0.1) }]}>
              <Icon name="doc.text.fill" size={16} color={iOSColors.green} />
              <Text style={[styles.badgeText, { color: theme.primaryText }]}>{displayName}</Text>
            </View>
          </View>

          <Section label="Invoice name (optional)" hint="Defaults to invoice number if left blank">
            <Field icon="pencil" iconColor={iOSColors.purple} placeholder="e.g. April Haircut, Website Design..." value={invoiceName} onChangeText={setInvoiceName} />
          </Section>

          <View style={[styles.banner, { borderColor: withOpacity(iOSColors.blue, 0.2) }]}>
            <Icon name="creditcard.fill" size={20} color={iOSColors.blue} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: theme.primaryText }]}>Online payments via Stripe</Text>
              <Text style={[styles.bannerSub, { color: theme.secondaryText }]}>When you send this invoice, clients can pay online with a secure Stripe payment link.</Text>
            </View>
          </View>

          <Section label="Client">
            <Pressable onPress={() => setClientSheet(true)} style={[styles.fieldCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Icon name="person.fill" size={20} color={iOSColors.blue} />
              {client ? (
                <View style={styles.fieldText}>
                  <Text style={[styles.fieldValue, { color: theme.primaryText }]}>{client.name}</Text>
                  <Text style={[styles.fieldSub, { color: theme.secondaryText }]}>{client.phoneNumber}</Text>
                </View>
              ) : (
                <Text style={[styles.fieldPlaceholder, { color: iOSColors.blue }]}>Select client</Text>
              )}
              <Icon name="chevron.right" size={14} color={theme.secondaryText} />
            </Pressable>
          </Section>

          {/* Line items */}
          <View style={styles.section}>
            <View style={styles.lineHead}>
              <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>Line items</Text>
              <Pressable onPress={() => setAddItem(true)} hitSlop={8}>
                <Text style={[styles.addItem, { color: iOSColors.blue }]}>+ Add item</Text>
              </Pressable>
            </View>

            {lineItems.length === 0 ? (
              <View style={[styles.fieldCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <Icon name="cart.fill" size={20} color={withOpacity(iOSColors.gray, 0.5)} />
                <Text style={[styles.fieldPlaceholder, { color: theme.secondaryText }]}>No items added yet</Text>
              </View>
            ) : (
              lineItems.map((item, index) => (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={[styles.itemDot, { backgroundColor: iOSColors.green }]} />
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemName, { color: theme.primaryText }]}>{item.description || 'Item'}</Text>
                    <Text style={[styles.itemQty, { color: theme.secondaryText }]}>{item.quantity} × {usd.format(item.unitPrice)}</Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.primaryText }]}>{usd.format(lineItemTotal(item))}</Text>
                  <Pressable onPress={() => setLineItems((prev) => prev.filter((_, i) => i !== index))} hitSlop={8}>
                    <Icon name="xmark.circle.fill" size={18} color={withOpacity(iOSColors.gray, 0.5)} />
                  </Pressable>
                </View>
              ))
            )}

            {/* Totals */}
            <View style={[styles.totals, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>Subtotal</Text>
                <Text style={[styles.totalValue, { color: theme.primaryText }]}>{usd.format(subtotal)}</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />
              <Pressable onPress={() => setTaxSheet(true)} style={styles.totalRow}>
                <View style={styles.taxLeft}>
                  <Icon name="percent" size={14} color={iOSColors.blue} />
                  <Text style={[styles.totalLabel, { color: taxRate === null ? iOSColors.blue : theme.secondaryText }]}>
                    {taxRate === null ? 'Add tax' : `Tax (${taxRate}%)`}
                  </Text>
                </View>
                <View style={styles.taxRight}>
                  {taxRate !== null ? <Text style={[styles.totalValue, { color: theme.primaryText }]}>{usd.format(tax)}</Text> : null}
                  <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                </View>
              </Pressable>
              <View style={[styles.divider, { backgroundColor: theme.divider }]} />
              <View style={[styles.totalDue, { backgroundColor: withOpacity(iOSColors.green, 0.05) }]}>
                <Text style={[styles.totalDueLabel, { color: theme.primaryText }]}>Total due</Text>
                <Text style={[styles.totalDueValue, { color: iOSColors.green }]}>{usd.format(total)}</Text>
              </View>
            </View>
          </View>

          {/* Due date */}
          <Section label="Due date">
            <Pressable onPress={() => setDateSheet(true)}>
              <LinearGradient colors={[iOSColors.blue, withOpacity(iOSColors.purple, 0.8)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dueCard}>
                <Icon name="calendar" size={18} color="#FFFFFF" />
                <Text style={styles.dueText}>{dateFmt.format(new Date(dueDate))}</Text>
                <Icon name="chevron.down" size={14} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </Pressable>
          </Section>

          <Section label="Message to client">
            <Field icon="text.bubble.fill" iconColor={theme.secondaryText} placeholder="Optional message..." value={message} onChangeText={setMessage} />
          </Section>

          <Section label="Email address" hint="Invoice notification will be sent to this address">
            <Field icon="envelope.fill" iconColor={iOSColors.blue} placeholder="email@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" />
          </Section>

          <View style={[styles.notifyCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.notifyText, { color: theme.primaryText }]}>Notify me when paid</Text>
            <Switch value={notifyWhenPaid} onValueChange={setNotifyWhenPaid} trackColor={{ true: iOSColors.blue, false: theme.divider }} />
          </View>

          <Pressable onPress={() => setPreview(true)} disabled={lineItems.length === 0} style={[styles.previewBtn, { borderColor: theme.divider, opacity: lineItems.length === 0 ? 0.5 : 1 }]}>
            <Icon name="eye.fill" size={16} color={theme.primaryText} />
            <Text style={[styles.previewText, { color: theme.primaryText }]}>Preview Invoice</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <AddItemSheet visible={addItem} onClose={() => setAddItem(false)} onAdd={(item) => { setLineItems((p) => [...p, item]); setAddItem(false); }} />
      <TaxSheet visible={taxSheet} current={taxRate} onClose={() => setTaxSheet(false)} onApply={(r) => { setTaxRate(r); setTaxSheet(false); }} />
      <ClientSheet visible={clientSheet} clients={clients} onClose={() => setClientSheet(false)} onPick={pickClient} />
      <DatePickerSheet visible={dateSheet} date={dueDate} onChange={setDueDate} onClose={() => setDateSheet(false)} />
      <InvoicePreview invoice={preview ? previewInvoice : null} businessName={businessName} visible={preview} onClose={() => setPreview(false)} />
    </DashboardGradient>
  );
}

/* ---------- field helpers ---------- */

function Section({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>{label}</Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: theme.secondaryText }]}>{hint}</Text> : null}
    </View>
  );
}

function Field({
  icon, iconColor, placeholder, value, onChangeText, keyboardType,
}: {
  icon: import('expo-symbols').SymbolViewProps['name']; iconColor: string; placeholder: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'email-address';
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.fieldCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Icon name={icon} size={18} color={iconColor} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.tertiaryText} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} style={[styles.fieldInput, { color: theme.primaryText }]} />
    </View>
  );
}

/* ---------- sheets ---------- */

function AddItemSheet({ visible, onClose, onAdd }: { visible: boolean; onClose: () => void; onAdd: (item: InvoiceLineItem) => void }) {
  const theme = useAppTheme();
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');

  const reset = () => { setDescription(''); setQuantity(1); setUnitPrice(''); };
  const valid = description.trim().length > 0 && Number(unitPrice) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Add line item</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Description" placeholderTextColor={theme.tertiaryText} style={[styles.sheetInput, { backgroundColor: theme.inputBackground, color: theme.primaryText }]} />
        <View style={styles.sheetRow}>
          <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Quantity</Text>
          <View style={styles.stepper}>
            <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={[styles.stepBtn, { backgroundColor: theme.inputBackground }]}><Icon name="minus" size={16} color={theme.primaryText} /></Pressable>
            <Text style={[styles.stepValue, { color: theme.primaryText }]}>{quantity}</Text>
            <Pressable onPress={() => setQuantity((q) => q + 1)} style={[styles.stepBtn, { backgroundColor: theme.inputBackground }]}><Icon name="plus" size={16} color={theme.primaryText} /></Pressable>
          </View>
        </View>
        <View style={styles.sheetRow}>
          <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Unit price</Text>
          <TextInput value={unitPrice} onChangeText={(t) => setUnitPrice(t.replace(/[^0-9.]/g, ''))} placeholder="0.00" placeholderTextColor={theme.tertiaryText} keyboardType="decimal-pad" style={[styles.priceInput, { backgroundColor: theme.inputBackground, color: theme.primaryText }]} />
        </View>
        <Pressable
          onPress={() => { if (valid) { onAdd({ id: uuid(), description: description.trim(), quantity, unitPrice: Number(unitPrice) }); reset(); } }}
          disabled={!valid}
          style={[styles.sheetSave, { backgroundColor: iOSColors.blue, opacity: valid ? 1 : 0.5 }]}>
          <Text style={styles.sheetSaveText}>Add Item</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function TaxSheet({ visible, current, onClose, onApply }: { visible: boolean; current: number | null; onClose: () => void; onApply: (rate: number | null) => void }) {
  const theme = useAppTheme();
  const [rate, setRate] = useState(current?.toString() ?? '');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Tax rate</Text>
        <View style={styles.sheetRow}>
          <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>Rate (%)</Text>
          <TextInput value={rate} onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))} placeholder="0.00" placeholderTextColor={theme.tertiaryText} keyboardType="decimal-pad" style={[styles.priceInput, { backgroundColor: theme.inputBackground, color: theme.primaryText }]} />
        </View>
        <Pressable onPress={() => onApply(rate ? Number(rate) : null)} style={[styles.sheetSave, { backgroundColor: iOSColors.blue }]}>
          <Text style={styles.sheetSaveText}>Apply</Text>
        </Pressable>
        <Pressable onPress={() => onApply(null)} style={styles.sheetClear}>
          <Text style={[styles.sheetClearText, { color: iOSColors.red }]}>Remove tax</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function ClientSheet({ visible, clients, onClose, onPick }: { visible: boolean; clients: Client[]; onClose: () => void; onPick: (c: Client) => void }) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, styles.clientSheet, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sheetTitle, { color: theme.primaryText }]}>Select client</Text>
        {clients.length === 0 ? (
          <Text style={[styles.sheetLabel, { color: theme.secondaryText }]}>No clients yet.</Text>
        ) : (
          <ScrollView>
            {clients.map((c) => (
              <Pressable key={c.id} onPress={() => onPick(c)} style={styles.clientRow}>
                <Text style={[styles.clientName, { color: theme.primaryText }]}>{c.name}</Text>
                <Text style={[styles.clientPhone, { color: theme.secondaryText }]}>{c.phoneNumber}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', marginHorizontal: 6, fontSize: 17, fontWeight: '700' },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  sendText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  body: { paddingBottom: 40, gap: 20 },
  badgeRow: { paddingHorizontal: 16, paddingTop: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  badgeText: { fontSize: 16, fontWeight: '600' },
  section: { gap: 12, paddingHorizontal: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12 },
  banner: { flexDirection: 'row', gap: 12, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,122,255,0.08)' },
  bannerText: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 15, fontWeight: '600' },
  bannerSub: { fontSize: 14 },
  fieldCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  fieldText: { flex: 1, gap: 4 },
  fieldValue: { fontSize: 16, fontWeight: '500' },
  fieldSub: { fontSize: 14 },
  fieldPlaceholder: { flex: 1, fontSize: 16, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  lineHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addItem: { fontSize: 14, fontWeight: '500' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  itemDot: { width: 10, height: 10, borderRadius: 5 },
  itemBody: { flex: 1, gap: 4 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemQty: { fontSize: 14 },
  itemTotal: { fontSize: 16, fontWeight: '600' },
  totals: { borderRadius: 12, overflow: 'hidden' },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  totalLabel: { fontSize: 15 },
  totalValue: { fontSize: 15, fontWeight: '500' },
  taxLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  taxRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  totalDue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  totalDueLabel: { fontSize: 16, fontWeight: '700' },
  totalDueValue: { fontSize: 20, fontWeight: '700' },
  dueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
  dueText: { flex: 1, color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  notifyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, padding: 16, borderRadius: 12 },
  notifyText: { fontSize: 15, fontWeight: '500' },
  previewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  previewText: { fontSize: 16, fontWeight: '600' },
  // sheets
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 16 },
  clientSheet: { maxHeight: '70%' },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetInput: { fontSize: 16, padding: 12, borderRadius: 10 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetLabel: { fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  priceInput: { fontSize: 16, padding: 12, borderRadius: 10, minWidth: 120, textAlign: 'right' },
  sheetSave: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  sheetSaveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sheetClear: { alignItems: 'center', paddingVertical: 4 },
  sheetClearText: { fontSize: 15, fontWeight: '500' },
  clientRow: { paddingVertical: 12, gap: 2 },
  clientName: { fontSize: 16, fontWeight: '500' },
  clientPhone: { fontSize: 14 },
});
