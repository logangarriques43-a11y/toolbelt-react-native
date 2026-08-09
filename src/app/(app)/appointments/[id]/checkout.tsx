/**
 * Checkout — port of CheckoutView.swift.
 * Service line + summary + discount sheet + payment-method sheet. Real payment
 * processing is Phase 5; "Take payment" records nothing and returns.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { withOpacity } from '@/lib/color';
import { useAppointments } from '@/context/appointments-store';
import { Brand, iOSColors, lightShadow } from '@/theme/tokens';
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
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerBtn}>
            <Icon name="chevron.left" size={20} weight="semibold" color={iOSColors.blue} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Checkout</Text>
          <View style={styles.headerBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Services */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Services</Text>
            <View style={[styles.card, styles.serviceRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={[styles.serviceIcon, { backgroundColor: withOpacity(serviceColor, 0.2) }]}>
                <Icon name="tag.fill" size={16} color={serviceColor} />
              </View>
              <Text style={[styles.serviceName, { color: theme.primaryText }]}>{serviceName}</Text>
              <Text style={[styles.servicePrice, { color: theme.primaryText, borderColor: withOpacity(iOSColors.gray, 0.3) }]}>
                ${Math.round(subtotal)}
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Summary</Text>
            <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme), styles.summary]}>
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
                <Text style={[styles.totalText, { color: theme.primaryText }]}>Total:</Text>
                <Text style={[styles.totalText, { color: theme.primaryText }]}>${Math.round(total)}</Text>
              </View>
            </View>
          </View>

          {/* To charge */}
          <View style={styles.charge}>
            <View style={styles.chargeRow}>
              <Text style={[styles.chargeLabel, { color: theme.primaryText }]}>To Charge:</Text>
              <Text style={[styles.chargeAmount, { color: Brand.accent }]}>${Math.round(total)}</Text>
            </View>

            <Pressable onPress={() => setDiscountSheet(true)} style={[styles.discountBtn, { borderColor: Brand.accent }]}>
              <Text style={[styles.discountText, { color: Brand.accent }]}>Add discount</Text>
            </Pressable>

            <Pressable onPress={() => setPaymentSheet(true)}>
              <LinearGradient colors={[Brand.accent, '#8066F2']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.payBtn}>
                <Text style={styles.payText}>Take payment</Text>
              </LinearGradient>
            </Pressable>
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
          <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={styles.sheetAction}>Cancel</Text></Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Add Discount</Text>
            <Pressable onPress={apply} hitSlop={8}><Text style={styles.sheetAction}>Apply</Text></Pressable>
          </View>

          <KeyboardAwareForm contentContainerStyle={styles.discountBody}>
            <View style={[styles.segmented, { backgroundColor: theme.divider }]}>
              {(['percentage', 'fixed'] as const).map((t) => (
                <Pressable key={t} onPress={() => setType(t)} style={[styles.segment, type === t ? { backgroundColor: Brand.accent } : null]}>
                  <Text style={[styles.segmentText, { color: type === t ? '#FFFFFF' : theme.secondaryText }]}>
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
                  <Pressable key={p} onPress={() => setValue(String(p))} style={[styles.quickChip, { borderColor: Brand.accent }]}>
                    <Text style={[styles.quickChipText, { color: Brand.accent }]}>{p}%</Text>
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
  const methods: { label: string; icon: SFSymbol; color: string }[] = [
    { label: 'Cash', icon: 'banknote.fill', color: GREEN },
    { label: 'Card', icon: 'creditcard.fill', color: Brand.accent },
    { label: 'Apple Pay', icon: 'apple.logo', color: theme.primaryText },
    { label: 'Other', icon: 'ellipsis.circle.fill', color: iOSColors.gray },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.9) }]}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={styles.sheetAction}>Cancel</Text></Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Payment Method</Text>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.paymentBody}>
            <Text style={[styles.paymentAmount, { color: Brand.accent }]}>${Math.round(amount)}</Text>
            <Text style={[styles.paymentSub, { color: theme.secondaryText }]}>Select payment method</Text>

            <View style={styles.methods}>
              {methods.map((m) => (
                <Pressable key={m.label} onPress={onComplete} style={[styles.methodRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                  <View style={[styles.methodIcon, { backgroundColor: withOpacity(m.color, 0.15) }]}>
                    <Icon name={m.icon} size={20} color={m.color} />
                  </View>
                  <Text style={[styles.methodLabel, { color: theme.primaryText }]}>{m.label}</Text>
                  <View style={styles.flex} />
                  <Icon name="chevron.right" size={14} color={theme.secondaryText} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  sheetAction: { fontSize: 16, color: iOSColors.blue },
  body: { paddingVertical: 20, gap: 20 },
  section: { gap: 12, paddingHorizontal: 20 },
  label: { fontSize: 14, fontWeight: '500' },
  card: { borderRadius: 12, padding: 16 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  serviceName: { flex: 1, fontSize: 16, fontWeight: '500' },
  servicePrice: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  summary: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { fontSize: 16 },
  summaryDivider: { height: StyleSheet.hairlineWidth },
  totalText: { fontSize: 18, fontWeight: '700' },
  charge: { gap: 16, paddingHorizontal: 20, paddingTop: 8 },
  chargeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chargeLabel: { fontSize: 20, fontWeight: '600' },
  chargeAmount: { fontSize: 24, fontWeight: '700' },
  discountBtn: { paddingVertical: 14, borderRadius: 25, borderWidth: 2, alignItems: 'center' },
  discountText: { fontSize: 16, fontWeight: '600' },
  payBtn: { paddingVertical: 16, borderRadius: 25, alignItems: 'center' },
  payText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  discountBody: { padding: 20, gap: 24, paddingTop: 24 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 24 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '500' },
  discountInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  discountSymbol: { fontSize: 24, fontWeight: '700' },
  discountInput: { fontSize: 48, fontWeight: '700', textAlign: 'center', minWidth: 120 },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  quickChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 14, fontWeight: '500' },
  paymentBody: { padding: 20, gap: 20, alignItems: 'center' },
  paymentAmount: { fontSize: 48, fontWeight: '700', paddingTop: 20 },
  paymentSub: { fontSize: 16 },
  methods: { gap: 12, alignSelf: 'stretch' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  methodIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 18, fontWeight: '500' },
  flex: { flex: 1 },
});
