/**
 * Checkout — port of CheckoutView.swift.
 * Service line + summary + discount sheet + payment-method sheet. Real payment
 * processing is Phase 5; "Take payment" records nothing and returns.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { withOpacity } from '@/lib/color';
import { useAppointments } from '@/context/appointments-store';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const GREEN = '#4CBF80';

export default function Checkout() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appointments } = useAppointments();
  const appt = appointments.find((a) => a.id === id);

  const [discount, setDiscount] = useState(0);
  const [discountSheet, setDiscountSheet] = useState(false);
  const [paymentSheet, setPaymentSheet] = useState(false);

  const subtotal = appt?.price ?? 0;
  const total = Math.max(0, subtotal - discount);
  const serviceName = appt?.serviceName ?? 'Service';
  const serviceColor = appt?.serviceColor ?? iOSColors.blue;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Icon name="chevron.left" size={20} weight="semibold" color={theme.accent} />
          </Pressable>
          <Text style={theme.display(24)}>Checkout</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Services */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Services</Text>
            <View style={[styles.card, styles.serviceRow, theme.card]}>
              <View style={[styles.serviceIcon, { backgroundColor: withOpacity(serviceColor, 0.2) }]}>
                <Icon name="tag.fill" size={16} color={serviceColor} />
              </View>
              <Text style={[styles.serviceName, { color: theme.primaryText }]}>{serviceName}</Text>
              <Text style={[styles.servicePrice, { color: theme.primaryText, borderColor: theme.divider, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                ${Math.round(subtotal)}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Summary</Text>
            <View style={[styles.card, theme.card, styles.summary]}>
              {discount > 0 ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: theme.secondaryText }]}>Subtotal:</Text>
                    <Text style={[styles.summaryText, { color: theme.secondaryText }]}>${Math.round(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryText, { color: GREEN }]}>Discount:</Text>
                    <Text style={[styles.summaryText, { color: GREEN }]}>-${Math.round(discount)}</Text>
                  </View>
                  <View style={[styles.summaryDivider, { backgroundColor: theme.divider }]} />
                </>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={theme.display(20, '500')}>Total:</Text>
                <Text style={theme.display(20, '500')}>${Math.round(total)}</Text>
              </View>
            </View>
          </View>

          {/* To charge */}
          <View style={styles.charge}>
            <View style={styles.chargeRow}>
              <Text style={theme.display(20)}>To Charge:</Text>
              <Text style={[theme.display(24, '500'), { color: theme.accent }]}>${Math.round(total)}</Text>
            </View>

            <ThemedButton title="Add discount" kind="quiet" onPress={() => setDiscountSheet(true)} />

            <ThemedButton title="Take payment" kind="inverse" onPress={() => setPaymentSheet(true)} />
          </View>
        </ScrollView>
      </SafeAreaView>

      <DiscountSheet visible={discountSheet} maxDiscount={subtotal} onApply={setDiscount} onClose={() => setDiscountSheet(false)} />
      <PaymentSheet visible={paymentSheet} amount={total} onClose={() => setPaymentSheet(false)} onComplete={() => { setPaymentSheet(false); router.back(); }} />
    </DashboardGradient>
  );
}

function DiscountSheet({ visible, maxDiscount, onApply, onClose }: { visible: boolean; maxDiscount: number; onApply: (d: number) => void; onClose: () => void }) {
  const theme = useAppTheme();
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');

  const apply = () => {
    const v = Number(value);
    if (!Number.isNaN(v)) {
      onApply(type === 'percentage' ? Math.min(maxDiscount, maxDiscount * (v / 100)) : Math.min(maxDiscount, v));
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={[styles.sheetAction, { color: theme.accent }]}>Cancel</Text></Pressable>
            <Text style={theme.display(24)}>Add Discount</Text>
            <Pressable onPress={apply} hitSlop={8}><Text style={[styles.sheetAction, { color: theme.accent }]}>Apply</Text></Pressable>
          </View>

          <KeyboardAwareForm contentContainerStyle={styles.discountBody}>
            <View style={[styles.segmented, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 24 }]}>
              {(['percentage', 'fixed'] as const).map((t) => (
                <Pressable key={t} onPress={() => setType(t)} style={[styles.segment, { borderRadius: theme.isEditorial ? 2 : 20 }, type === t ? { backgroundColor: theme.accent } : null]}>
                  <Text style={[styles.segmentText, { color: type === t ? theme.onAccent : theme.secondaryText }]}>
                    {t === 'percentage' ? 'Percentage' : 'Fixed Amount'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.discountInputRow}>
              {type === 'fixed' ? <Text style={[styles.discountSymbol, { color: theme.primaryText }]}>$</Text> : null}
              <TextInput
                value={value}
                onChangeText={(t) => setValue(t.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={theme.tertiaryText}
                keyboardType="decimal-pad"
                style={[styles.discountInput, { color: theme.primaryText }]}
              />
              {type === 'percentage' ? <Text style={[styles.discountSymbol, { color: theme.primaryText }]}>%</Text> : null}
            </View>

            {type === 'percentage' ? (
              <View style={styles.quickRow}>
                {[10, 15, 20, 25].map((p) => (
                  <Pressable key={p} onPress={() => setValue(String(p))} style={[styles.quickChip, { borderColor: theme.divider, backgroundColor: theme.cardBackground, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                    <Text style={[styles.quickChipText, { color: theme.accent }]}>{p}%</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </KeyboardAwareForm>
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

function PaymentSheet({ visible, amount, onClose, onComplete }: { visible: boolean; amount: number; onClose: () => void; onComplete: () => void }) {
  const theme = useAppTheme();
  const methods: { label: string; icon: SFSymbol }[] = [
    { label: 'Cash', icon: 'banknote.fill' },
    { label: 'Card', icon: 'creditcard.fill' },
    { label: 'Apple Pay', icon: 'apple.logo' },
    { label: 'Other', icon: 'ellipsis.circle.fill' },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.divider }]}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={[styles.sheetAction, { color: theme.accent }]}>Cancel</Text></Pressable>
            <Text style={theme.display(24)}>Payment Method</Text>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.paymentBody}>
            <Text style={[styles.paymentAmount, theme.display(48, '500'), { color: theme.accent }]}>${Math.round(amount)}</Text>
            <Text style={[styles.paymentSub, { color: theme.secondaryText }]}>Select payment method</Text>

            <View style={styles.methods}>
              {methods.map((m) => (
                <Pressable key={m.label} onPress={onComplete} style={[styles.methodRow, theme.card]}>
                  <ThemedIconTile name={m.icon} size={44} />
                  <Text style={[styles.methodLabel, { color: theme.primaryText }]}>{m.label}</Text>
                  <View style={styles.flex} />
                  <Icon name="chevron.right" size={14} color={theme.chevronTint} />
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  sheetAction: { fontSize: 16 },
  body: { paddingVertical: 20, gap: 20 },
  section: { gap: 12, paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '500' },
  card: { padding: 16 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  serviceName: { flex: 1, fontSize: 16, fontWeight: '500' },
  servicePrice: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, overflow: 'hidden' },
  summary: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { fontSize: 16 },
  summaryDivider: { height: StyleSheet.hairlineWidth },
  charge: { gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  chargeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discountBody: { padding: 20, gap: 24, paddingTop: 24 },
  segmented: { flexDirection: 'row', padding: 4 },
  segment: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '500' },
  discountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discountSymbol: { fontSize: 24, fontWeight: '700' },
  discountInput: { fontSize: 48, fontWeight: '700', textAlign: 'center', minWidth: 120 },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  quickChipText: { fontSize: 14, fontWeight: '500' },
  paymentBody: { padding: 20, gap: 20, alignItems: 'center' },
  paymentAmount: { paddingTop: 20 },
  paymentSub: { fontSize: 16 },
  methods: { gap: 12, alignSelf: 'stretch' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  methodLabel: { fontSize: 18, fontWeight: '500' },
  flex: { flex: 1 },
});
