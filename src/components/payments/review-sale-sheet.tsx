/**
 * Review Sale sheet — port of PaymentReviewSaleSheet.swift.
 * Confirms a checkout: optional client, per-item quantity editing, notes, a
 * 2×2 payment-method grid, and a local tax line, then writes a SaleTransaction
 * and decrements product stock. Real card capture (Stripe PaymentSheet / Tap to
 * Pay) is native and deferred to Phase 7 — every method finalizes locally here.
 * Tax is computed per-product from salesTaxEnabled/salesTaxRate (the Swift build
 * also has a backend Stripe-Tax path + a global manual rate, both deferred).
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { BRAND_BLUE, BRAND_PURPLE } from '@/components/payments/checkout';
import { useClients } from '@/context/clients-store';
import { useProducts } from '@/context/products-store';
import { useSales } from '@/context/sales-store';
import { uuid } from '@/lib/id';
import { withOpacity } from '@/lib/color';
import { clientInitials, type Client } from '@/models/client';
import {
  productsTotal,
  servicesTotal,
  type SelectedProductItem,
  type SelectedServiceItem,
} from '@/models/cart';
import { PAYMENT_METHODS, type PaymentMethod, type SaleItem } from '@/models/sale';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const GREEN = '#33C773';
const GREEN_DARK = '#27AE60';

interface ReviewSaleSheetProps {
  visible: boolean;
  selectedServices: SelectedServiceItem[];
  selectedProducts: SelectedProductItem[];
  setSelectedServices: Dispatch<SetStateAction<SelectedServiceItem[]>>;
  setSelectedProducts: Dispatch<SetStateAction<SelectedProductItem[]>>;
  customAmount?: number;
  onClose: () => void;
  onComplete: () => void;
}

export function ReviewSaleSheet(props: ReviewSaleSheetProps) {
  const { visible, selectedServices, selectedProducts, customAmount, onClose, onComplete } = props;
  const theme = useAppTheme();
  const sales = useSales();
  const products = useProducts();

  const [client, setClient] = useState<Client | null>(null);
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Fresh state every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setClient(null);
      setNotes('');
      setMethod(null);
      setShowWarning(false);
    }
  }, [visible]);

  const servicesSub = servicesTotal(selectedServices);
  const productsSub = productsTotal(selectedProducts);
  const custom = customAmount ?? 0;
  const subtotal = servicesSub + productsSub + custom;

  const taxedProducts = selectedProducts.filter(
    (p) => p.product.salesTaxEnabled && p.product.salesTaxRate > 0,
  );
  const taxAmount = taxedProducts.reduce(
    (s, i) => s + i.product.price * i.quantity * (i.product.salesTaxRate / 100),
    0,
  );
  const taxRate = subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
  const hasTax = taxedProducts.length > 0;
  const totalWithTax = subtotal + taxAmount;

  const isKeypadSale = customAmount != null && selectedServices.length === 0 && selectedProducts.length === 0;
  const hasKeypadAmount = custom > 0;
  const canComplete = method != null && subtotal > 0;

  const sourceChips =
    (selectedServices.length > 0 || selectedProducts.length > 0) &&
    (hasKeypadAmount || (selectedServices.length > 0 && selectedProducts.length > 0));

  const decService = (index: number) =>
    props.setSelectedServices((prev) => {
      const copy = [...prev];
      if (copy[index].quantity > 1) copy[index] = { ...copy[index], quantity: copy[index].quantity - 1 };
      else copy.splice(index, 1);
      return copy;
    });

  const decProduct = (index: number) =>
    props.setSelectedProducts((prev) => {
      const copy = [...prev];
      if (copy[index].quantity > 1) copy[index] = { ...copy[index], quantity: copy[index].quantity - 1 };
      else copy.splice(index, 1);
      return copy;
    });

  const finalize = () => {
    const items: SaleItem[] = [
      ...selectedServices.map((it) => ({
        id: uuid(),
        name: it.service.name,
        colorHex: it.service.colorHex,
        price: it.service.price,
        quantity: it.quantity,
      })),
      ...selectedProducts.map((it) => ({
        id: uuid(),
        name: it.product.name,
        colorHex: it.product.colorHex,
        price: it.product.price,
        quantity: it.quantity,
      })),
    ];
    sales.addSale({
      date: new Date().toISOString(),
      items,
      customAmount,
      totalAmount: totalWithTax,
      paymentMethod: method ?? 'Cash',
      clientId: client?.id,
      clientName: client?.name,
      notes,
      isKeypadSale,
      taxAmount: taxAmount > 0 ? taxAmount : undefined,
      taxRate: taxRate > 0 ? taxRate : undefined,
    });
    selectedProducts.forEach((it) => products.decrementStock(it.product.id, it.quantity));
    onComplete();
    onClose();
  };

  const completeSale = () => {
    if (!canComplete) return;
    if (!client) setShowWarning(true);
    else finalize();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.cardBackground }]}>
              <Icon name="xmark" size={16} color={theme.secondaryText} weight="medium" />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Review Sale</Text>
            <View style={styles.roundBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Total */}
            <View style={styles.totalBlock}>
              <Text style={[styles.totalLabel, { color: theme.secondaryText }]}>Total</Text>
              <Text style={[styles.totalValue, { color: theme.primaryText }]}>${totalWithTax.toFixed(2)}</Text>
              {hasTax && subtotal > 0 && (
                <View style={styles.taxLines}>
                  <Text style={[styles.taxLine, { color: theme.secondaryText }]}>Subtotal ${subtotal.toFixed(2)}</Text>
                  <Text style={[styles.taxLine, { color: theme.secondaryText }]}>
                    Tax ({taxRate.toFixed(2)}%) ${taxAmount.toFixed(2)}
                  </Text>
                </View>
              )}
              {sourceChips && (
                <View style={styles.sourceRow}>
                  {selectedServices.length > 0 && <Source dot={BRAND_BLUE} label={`Services $${servicesSub.toFixed(2)}`} />}
                  {selectedProducts.length > 0 && <Source dot={BRAND_PURPLE} label={`Products $${productsSub.toFixed(2)}`} />}
                  {hasKeypadAmount && <Source dot={iOSColors.orange} label={`Keypad $${custom.toFixed(2)}`} />}
                </View>
              )}
            </View>

            {/* Client */}
            <Field label="Client">
              <Pressable
                style={[styles.card, styles.clientCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}
                onPress={() => setShowClientPicker(true)}>
                {client ? (
                  <>
                    <View style={[styles.clientAvatar, { backgroundColor: withOpacity(iOSColors.blue, 0.15) }]}>
                      <Text style={[styles.clientAvatarText, { color: iOSColors.blue }]}>{clientInitials(client.name)}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.clientName, { color: theme.primaryText }]}>{client.name}</Text>
                      <Text style={[styles.clientPhone, { color: theme.secondaryText }]}>{client.phoneNumber}</Text>
                    </View>
                    <Pressable onPress={() => setClient(null)} hitSlop={8}>
                      <Icon name="xmark.circle.fill" size={20} color={withOpacity(iOSColors.gray, 0.4)} />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={[styles.clientAvatar, { backgroundColor: withOpacity(iOSColors.gray, 0.1) }]}>
                      <Icon name="person.badge.plus" size={16} color={theme.secondaryText} />
                    </View>
                    <Text style={[styles.addClient, { color: theme.secondaryText }]}>Add Client (Optional)</Text>
                    <View style={styles.flex} />
                    <Icon name="chevron.right" size={14} color={theme.secondaryText} />
                  </>
                )}
              </Pressable>
            </Field>

            {/* Items */}
            {selectedServices.length > 0 && (
              <Field
                label="Items"
                trailing={`${selectedServices.length} service${selectedServices.length === 1 ? '' : 's'}`}>
                <View style={[styles.listCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  {selectedServices.map((it, i) => (
                    <ReviewRow
                      key={`${it.service.id}-${i}`}
                      name={it.service.name}
                      color={it.service.colorHex}
                      price={it.service.price}
                      quantity={it.quantity}
                      divider={i < selectedServices.length - 1}
                      onDec={() => decService(i)}
                    />
                  ))}
                </View>
              </Field>
            )}

            {/* Products */}
            {selectedProducts.length > 0 && (
              <Field
                label="Products"
                trailing={`${selectedProducts.length} product${selectedProducts.length === 1 ? '' : 's'}`}>
                <View style={[styles.listCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  {selectedProducts.map((it, i) => (
                    <ReviewRow
                      key={`${it.product.id}-${i}`}
                      name={it.product.name}
                      color={it.product.colorHex}
                      price={it.product.price}
                      quantity={it.quantity}
                      divider={i < selectedProducts.length - 1}
                      onDec={() => decProduct(i)}
                    />
                  ))}
                </View>
              </Field>
            )}

            {/* Keypad amount */}
            {hasKeypadAmount && (
              <Field label="Custom Amount">
                <View style={[styles.card, styles.clientCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={[styles.clientAvatar, { backgroundColor: withOpacity(iOSColors.orange, 0.15) }]}>
                    <Icon name="number.square.fill" size={18} color={iOSColors.orange} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.clientName, { color: theme.primaryText }]}>Keypad Entry</Text>
                    <Text style={[styles.clientPhone, { color: theme.secondaryText }]}>Entered via keypad</Text>
                  </View>
                  <Text style={[styles.keypadAmount, { color: iOSColors.orange }]}>${custom.toFixed(2)}</Text>
                </View>
              </Field>
            )}

            {/* Notes */}
            <Field label="Notes">
              <View style={[styles.notesCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add notes about this sale..."
                  placeholderTextColor={withOpacity(iOSColors.gray, 0.5)}
                  multiline
                  style={[styles.notesInput, { color: theme.primaryText }]}
                />
              </View>
            </Field>

            {/* Payment method */}
            <Field label="Payment Method">
              <View style={styles.methodGrid}>
                {PAYMENT_METHODS.map((m) => {
                  const active = method === m.method;
                  return (
                    <Pressable key={m.method} style={styles.methodWrap} onPress={() => setMethod(m.method)}>
                      {active ? (
                        <LinearGradient
                          colors={[m.color, withOpacity(m.color, 0.8)]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.method}>
                          <Icon name={m.icon} size={28} color="#FFFFFF" />
                          <Text style={[styles.methodLabel, { color: '#FFFFFF' }]}>{m.method}</Text>
                        </LinearGradient>
                      ) : (
                        <View style={[styles.method, { backgroundColor: theme.cardBackground, borderColor: theme.divider, borderWidth: 1 }]}>
                          <Icon name={m.icon} size={28} color={m.color} />
                          <Text style={[styles.methodLabel, { color: theme.primaryText }]}>{m.method}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          </ScrollView>

          {/* Complete */}
          <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={completeSale} disabled={!canComplete}>
              {canComplete ? (
                <LinearGradient colors={[GREEN, GREEN_DARK]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.completeBtn}>
                  <Icon name="checkmark.circle.fill" size={20} color="#FFFFFF" />
                  <Text style={styles.completeText}>Complete Sale</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.completeBtn, { backgroundColor: withOpacity(iOSColors.gray, 0.4) }]}>
                  <Icon name="checkmark.circle.fill" size={20} color="#FFFFFF" />
                  <Text style={styles.completeText}>Complete Sale</Text>
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </DashboardGradient>

      <ClientPicker
        visible={showClientPicker}
        selectedId={client?.id}
        onSelect={(c) => {
          setClient(c);
          setShowClientPicker(false);
        }}
        onClose={() => setShowClientPicker(false)}
      />

      <NoClientWarning
        visible={showWarning}
        onAddClient={() => {
          setShowWarning(false);
          setShowClientPicker(true);
        }}
        onContinue={() => {
          setShowWarning(false);
          finalize();
        }}
        onDismiss={() => setShowWarning(false)}
      />
    </Modal>
  );
}

// ── Building blocks ───────────────────────────────────────────────────

function Field({ label, trailing, children }: { label: string; trailing?: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
        {trailing && <Text style={[styles.fieldTrailing, { color: withOpacity(iOSColors.gray, 0.6) }]}>{trailing}</Text>}
      </View>
      {children}
    </View>
  );
}

function Source({ dot, label }: { dot: string; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.source}>
      <View style={[styles.sourceDot, { backgroundColor: dot }]} />
      <Text style={[styles.sourceLabel, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

function ReviewRow({
  name,
  color,
  price,
  quantity,
  divider,
  onDec,
}: {
  name: string;
  color: string;
  price: number;
  quantity: number;
  divider: boolean;
  onDec: () => void;
}) {
  const theme = useAppTheme();
  const removing = quantity <= 1;
  return (
    <View>
      <View style={styles.reviewRow}>
        <View style={[styles.reviewAvatar, { backgroundColor: color }]}>
          <Text style={styles.reviewAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.reviewName, { color: theme.primaryText }]}>{name}</Text>
          <Text style={[styles.reviewQty, { color: theme.secondaryText }]}>
            Qty: {quantity} × ${price.toFixed(0)}
          </Text>
        </View>
        <Pressable onPress={onDec} style={[styles.stepBtn, { backgroundColor: withOpacity(iOSColors.gray, 0.1) }]}>
          <Icon name={removing ? 'trash' : 'minus'} size={12} color={removing ? iOSColors.red : iOSColors.gray} weight="semibold" />
        </Pressable>
        <Text style={[styles.reviewTotal, { color: theme.primaryText }]}>${(price * quantity).toFixed(2)}</Text>
      </View>
      {divider && <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />}
    </View>
  );
}

// ── Client picker ─────────────────────────────────────────────────────

function ClientPicker({
  visible,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedId?: string;
  onSelect: (c: Client) => void;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { clients, searchClients } = useClients();
  const [search, setSearch] = useState('');
  const list = search.trim() ? searchClients(search) : clients;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerBackdrop}>
        <Pressable style={styles.flex} onPress={onClose} />
        <View style={[styles.picker, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.grabber} />
          <View style={styles.pickerHead}>
            <Text style={[styles.pickerTitle, { color: theme.primaryText }]}>Select Client</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="xmark.circle.fill" size={24} color={withOpacity(iOSColors.gray, 0.4)} />
            </Pressable>
          </View>
          <View style={[styles.searchBar, { backgroundColor: withOpacity(iOSColors.gray, 0.08) }]}>
            <Icon name="magnifyingglass" size={15} color={theme.secondaryText} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search clients..."
              placeholderTextColor={theme.secondaryText}
              style={[styles.searchInput, { color: theme.primaryText }]}
            />
          </View>
          {list.length === 0 ? (
            <View style={styles.pickerEmpty}>
              <Icon name="person.2.slash" size={36} color={theme.tertiaryText} />
              <Text style={[styles.pickerEmptyText, { color: theme.secondaryText }]}>
                {search.trim() ? 'No results' : 'No clients yet'}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.pickerList}>
              {list.map((c) => {
                const active = c.id === selectedId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => onSelect(c)}
                    style={[styles.pickerRow, active && { backgroundColor: withOpacity(BRAND_BLUE, 0.06) }]}>
                    <View style={[styles.clientAvatar, { backgroundColor: withOpacity(iOSColors.blue, 0.15) }]}>
                      <Text style={[styles.clientAvatarText, { color: iOSColors.blue }]}>{clientInitials(c.name)}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.clientName, { color: theme.primaryText }]}>{c.name}</Text>
                      <Text style={[styles.clientPhone, { color: theme.secondaryText }]}>{c.phoneNumber}</Text>
                    </View>
                    {active && <Icon name="checkmark.circle.fill" size={20} color={BRAND_BLUE} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── No-client warning ─────────────────────────────────────────────────

function NoClientWarning({
  visible,
  onAddClient,
  onContinue,
  onDismiss,
}: {
  visible: boolean;
  onAddClient: () => void;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDismiss}>
      <Pressable style={styles.warningBackdrop} onPress={onDismiss}>
        <Pressable style={[styles.warningCard, { backgroundColor: theme.cardBackground }]} onPress={() => {}}>
          <View style={[styles.warningIcon, { backgroundColor: withOpacity(iOSColors.orange, 0.15) }]}>
            <Icon name="exclamationmark.triangle.fill" size={26} color={iOSColors.orange} />
          </View>
          <Text style={[styles.warningTitle, { color: theme.primaryText }]}>No Client Attached</Text>
          <Text style={[styles.warningBody, { color: theme.secondaryText }]}>
            This sale won't be linked to any client. You can still complete it, but it won't appear in a client's
            transaction history.
          </Text>
          <View style={styles.warningButtons}>
            <Pressable style={[styles.warningBtn, { backgroundColor: withOpacity(BRAND_BLUE, 0.1) }]} onPress={onAddClient}>
              <Text style={[styles.warningBtnText, { color: BRAND_BLUE }]}>Add Client</Text>
            </Pressable>
            <Pressable style={[styles.warningBtn, { backgroundColor: iOSColors.orange }]} onPress={onContinue}>
              <Text style={[styles.warningBtnText, { color: '#FFFFFF' }]}>Continue Anyway</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { paddingBottom: 32, gap: 24, paddingTop: 20 },
  // Total
  totalBlock: { alignItems: 'center', gap: 8 },
  totalLabel: { fontSize: 14, fontWeight: '500' },
  totalValue: { fontSize: 52, fontWeight: '700' },
  taxLines: { alignItems: 'center', gap: 4 },
  taxLine: { fontSize: 12, fontWeight: '500' },
  sourceRow: { flexDirection: 'row', gap: 12, marginTop: 2 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sourceDot: { width: 6, height: 6, borderRadius: 3 },
  sourceLabel: { fontSize: 12, fontWeight: '500' },
  // Field
  field: { gap: 12 },
  fieldHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  fieldTrailing: { fontSize: 12, fontWeight: '500' },
  // Cards
  card: { borderRadius: 12, marginHorizontal: 16 },
  clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  clientAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  clientAvatarText: { fontSize: 15, fontWeight: '700' },
  clientName: { fontSize: 16, fontWeight: '600' },
  clientPhone: { fontSize: 13 },
  addClient: { fontSize: 15, fontWeight: '500' },
  keypadAmount: { fontSize: 16, fontWeight: '700' },
  listCard: { borderRadius: 12, marginHorizontal: 16, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  reviewName: { fontSize: 15, fontWeight: '500' },
  reviewQty: { fontSize: 13 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  reviewTotal: { fontSize: 15, fontWeight: '700', minWidth: 50, textAlign: 'right' },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 68 },
  // Notes
  notesCard: { borderRadius: 12, marginHorizontal: 16, padding: 12 },
  notesInput: { fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  // Methods
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  methodWrap: { width: '47%', flexGrow: 1 },
  method: { alignItems: 'center', gap: 10, paddingVertical: 24, borderRadius: 12 },
  methodLabel: { fontSize: 14, fontWeight: '600' },
  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18, borderRadius: 14 },
  completeText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  // Client picker
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  picker: { maxHeight: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 20 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.3)', marginTop: 12, marginBottom: 8 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  pickerTitle: { fontSize: 18, fontWeight: '700' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginHorizontal: 20, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15 },
  pickerEmpty: { alignItems: 'center', gap: 12, paddingTop: 30 },
  pickerEmptyText: { fontSize: 15, fontWeight: '500' },
  pickerList: { paddingHorizontal: 14, paddingBottom: 20, gap: 6 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  // Warning
  warningBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  warningCard: { width: '100%', alignItems: 'center', gap: 16, padding: 24, borderRadius: 20 },
  warningIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  warningTitle: { fontSize: 18, fontWeight: '700' },
  warningBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  warningButtons: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  warningBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  warningBtnText: { fontSize: 15, fontWeight: '600' },
});
