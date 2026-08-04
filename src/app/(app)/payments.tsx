/**
 * Payments hub — port of PaymentsView.swift.
 * A self-contained POS surface: custom header (close + clear-cart), a section
 * switcher (Checkout / Transactions / Features / AI / More) along the bottom, and
 * — in Checkout — a Total/Charge bar over the cart. Cart state lives here and is
 * threaded into <Checkout>. Transactions/Features/AI/More are placeholders until
 * 5d/5e; "Charge" opens the Review Sale sheet in 5c.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { AddProductSheet } from '@/components/payments/add-product-sheet';
import { BRAND_BLUE, Checkout, type CheckoutTab } from '@/components/payments/checkout';
import { PaymentFeatures, PaymentMore } from '@/components/payments/features';
import { ReviewSaleSheet } from '@/components/payments/review-sale-sheet';
import { PaymentTransactions } from '@/components/payments/transactions';
import { useProducts } from '@/context/products-store';
import { useServices } from '@/context/services-store';
import {
  cartItemCount,
  productsTotal,
  servicesTotal,
  type SelectedProductItem,
  type SelectedServiceItem,
} from '@/models/cart';
import type { Product } from '@/models/product';
import type { Service } from '@/models/service';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Section = 'Checkout' | 'Transactions' | 'Features' | 'AI' | 'More';

const SECTIONS: { section: Section; icon: SFSymbol }[] = [
  { section: 'Checkout', icon: 'cart.fill' },
  { section: 'Transactions', icon: 'list.bullet.rectangle.portrait.fill' },
  { section: 'Features', icon: 'star.fill' },
  { section: 'AI', icon: 'brain' },
  { section: 'More', icon: 'ellipsis.circle.fill' },
];

export default function Payments() {
  const theme = useAppTheme();
  const router = useRouter();
  const servicesStore = useServices();
  const productsStore = useProducts();

  const [section, setSection] = useState<Section>('Checkout');
  const [tab, setTab] = useState<CheckoutTab>('Services');
  const [showServiceList, setShowServiceList] = useState(false);
  const [showProductList, setShowProductList] = useState(false);

  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductItem[]>([]);
  const [enteredAmount, setEnteredAmount] = useState('0');
  const [keypadAmount, setKeypadAmount] = useState(0);

  const [showReview, setShowReview] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // ── Derived totals ──
  const sTotal = servicesTotal(selectedServices);
  const pTotal = productsTotal(selectedProducts);
  const keypadDisplayAmount = enteredAmount !== '0' && enteredAmount !== '' ? (Number(enteredAmount) || 0) / 100 : 0;
  const cartTotal = sTotal + pTotal + keypadAmount;
  const displayTotal = tab === 'Keypad' ? sTotal + pTotal + keypadDisplayAmount : cartTotal;
  const itemCount = cartItemCount(selectedServices, selectedProducts);
  const hasItems = itemCount > 0 || keypadAmount > 0;
  const canCharge = tab === 'Keypad' ? sTotal + pTotal + keypadDisplayAmount > 0 : cartTotal > 0;

  // ── Cart mutations ──
  const clearCart = () => {
    setSelectedServices([]);
    setSelectedProducts([]);
    setEnteredAmount('0');
    setKeypadAmount(0);
  };

  const addService = (s: Service) =>
    setSelectedServices((prev) => {
      const i = prev.findIndex((x) => x.service.id === s.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...prev, { service: s, quantity: 1 }];
    });

  const addProduct = (p: Product) =>
    setSelectedProducts((prev) => {
      const i = prev.findIndex((x) => x.product.id === p.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], quantity: copy[i].quantity + 1 };
        return copy;
      }
      return [...prev, { product: p, quantity: 1 }];
    });

  const changeTab = (t: CheckoutTab) => {
    if (tab === 'Keypad' && t !== 'Keypad') setKeypadAmount(keypadDisplayAmount);
    setTab(t);
  };

  const handleKey = (key: string) =>
    setEnteredAmount((prev) => {
      if (key === '⌫') return prev.length > 1 ? prev.slice(0, -1) : '0';
      if (key === '00') return prev !== '0' && prev.length < 7 ? prev + '00' : prev;
      if (prev === '0') return key;
      return prev.length < 8 ? prev + key : prev;
    });

  const deleteService = (s: Service) => {
    servicesStore.deleteService(s.id);
    setSelectedServices((prev) => prev.filter((x) => x.service.id !== s.id));
  };
  const deleteProduct = (p: Product) => {
    productsStore.deleteProduct(p.id);
    setSelectedProducts((prev) => prev.filter((x) => x.product.id !== p.id));
  };

  // The committed keypad amount handed to Review (covers the not-yet-flushed state).
  const effectiveCustom = keypadAmount > 0 ? keypadAmount : tab === 'Keypad' ? keypadDisplayAmount : 0;

  const onCharge = () => {
    if (tab === 'Keypad') setKeypadAmount(keypadDisplayAmount);
    setShowReview(true);
  };

  const openNewProduct = () => {
    setProductToEdit(null);
    setShowProductForm(true);
  };
  const openEditProduct = (p: Product) => {
    setProductToEdit(p);
    setShowProductForm(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <RoundButton icon="house.fill" color={iOSColors.blue} onPress={() => router.back()} />
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{section}</Text>
        <RoundButton
          icon="trash"
          color={hasItems ? iOSColors.red : withOpacity(iOSColors.gray, 0.5)}
          onPress={clearCart}
          disabled={!hasItems}
        />
      </View>

      {/* Section content */}
      <View style={styles.flex}>
        {section === 'Transactions' ? (
          <PaymentTransactions />
        ) : section === 'Checkout' ? (
          <Checkout
            services={servicesStore.services}
            products={productsStore.products}
            selectedServices={selectedServices}
            selectedProducts={selectedProducts}
            tab={tab}
            onTabChange={changeTab}
            showServiceList={showServiceList}
            showProductList={showProductList}
            onToggleLayout={() =>
              tab === 'Services' ? setShowServiceList((v) => !v) : setShowProductList((v) => !v)
            }
            enteredAmount={enteredAmount}
            onKey={handleKey}
            onAddService={addService}
            onAddProduct={addProduct}
            onNewService={() => router.push('/services/new')}
            onNewProduct={openNewProduct}
            onEditService={(s) => router.push(`/services/${s.id}`)}
            onDeleteService={deleteService}
            onEditProduct={openEditProduct}
            onDeleteProduct={deleteProduct}
          />
        ) : section === 'Features' ? (
          <PaymentFeatures />
        ) : section === 'More' ? (
          <PaymentMore />
        ) : (
          <SectionPlaceholder section={section} />
        )}
      </View>

      {/* Checkout bar */}
      {section === 'Checkout' && (
        <View style={[styles.chargeBar, { backgroundColor: theme.cardBackground, borderTopColor: theme.divider }]}>
          <View style={styles.chargeTotals}>
            <Text style={[styles.chargeLabel, { color: theme.secondaryText }]}>Total</Text>
            <Text style={[styles.chargeAmount, { color: theme.primaryText }]}>${displayTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.chips}>
            {itemCount > 0 && <Chip text={`${itemCount} item${itemCount === 1 ? '' : 's'}`} color={BRAND_BLUE} />}
            {(keypadAmount > 0 || (tab === 'Keypad' && keypadDisplayAmount > 0)) && (
              <Chip
                text={`+$${(tab === 'Keypad' ? keypadDisplayAmount : keypadAmount).toFixed(2)} keypad`}
                color={iOSColors.orange}
              />
            )}
          </View>
          <View style={styles.flex} />
          <Pressable onPress={onCharge} disabled={!canCharge} style={styles.chargeBtnWrap}>
            <View
              style={[
                styles.chargeBtn,
                { backgroundColor: canCharge ? BRAND_BLUE : withOpacity(iOSColors.gray, 0.3) },
              ]}>
              <Icon name="cart.badge.plus" size={14} color="#FFFFFF" weight="semibold" />
              <Text style={styles.chargeBtnText}>Charge</Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Bottom nav */}
      <View style={[styles.nav, { backgroundColor: theme.cardBackground, borderTopColor: theme.divider }]}>
        {SECTIONS.map(({ section: s, icon }) => {
          const active = section === s;
          return (
            <Pressable key={s} style={styles.navItem} onPress={() => setSection(s)}>
              <Icon name={icon} size={20} color={active ? BRAND_BLUE : iOSColors.gray} />
              <Text numberOfLines={1} allowFontScaling={false} style={[styles.navLabel, { color: active ? BRAND_BLUE : iOSColors.gray }]}>{s}</Text>
            </Pressable>
          );
        })}
      </View>

      <ReviewSaleSheet
        visible={showReview}
        selectedServices={selectedServices}
        selectedProducts={selectedProducts}
        setSelectedServices={setSelectedServices}
        setSelectedProducts={setSelectedProducts}
        customAmount={effectiveCustom > 0 ? effectiveCustom : undefined}
        onClose={() => setShowReview(false)}
        onComplete={clearCart}
      />

      <AddProductSheet
        visible={showProductForm}
        editingProduct={productToEdit}
        onClose={() => setShowProductForm(false)}
      />
    </SafeAreaView>
  );
}

function RoundButton({
  icon,
  color,
  onPress,
  disabled,
}: {
  icon: SFSymbol;
  color: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.roundBtn, { backgroundColor: theme.cardBackground }]}>
      <Icon name={icon} size={18} color={color} weight="medium" />
    </Pressable>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: withOpacity(color, 0.1) }]}>
      <Text style={[styles.chipText, { color }]}>{text}</Text>
    </View>
  );
}

function SectionPlaceholder({ section }: { section: Section }) {
  const theme = useAppTheme();
  const copy: Record<Exclude<Section, 'Checkout'>, { icon: SFSymbol; title: string; sub: string }> = {
    Transactions: { icon: 'list.bullet.rectangle.portrait.fill', title: 'Transactions', sub: 'Sales & payment history arrives in 5d.' },
    Features: { icon: 'star.fill', title: 'Payment Features', sub: 'Gift cards, links, reminders & more arrive in 5e.' },
    AI: { icon: 'brain', title: 'Payments AI', sub: 'Your payments copilot is coming soon.' },
    More: { icon: 'ellipsis.circle.fill', title: 'More', sub: 'Additional payment options are coming soon.' },
  };
  const c = copy[section as Exclude<Section, 'Checkout'>];
  return (
    <View style={styles.placeholder}>
      <Icon name={c.icon} size={44} color={withOpacity(iOSColors.gray, 0.5)} />
      <Text style={[styles.placeholderTitle, { color: theme.primaryText }]}>{c.title}</Text>
      <Text style={[styles.placeholderSub, { color: theme.secondaryText }]}>{c.sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chargeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chargeTotals: { gap: 2 },
  chargeLabel: { fontSize: 12, fontWeight: '500' },
  chargeAmount: { fontSize: 22, fontWeight: '700' },
  chips: { gap: 3 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '500' },
  chargeBtnWrap: {},
  chargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  chargeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  nav: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 4,
  },
  navItem: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  navLabel: { fontSize: 9, fontWeight: '500' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  placeholderTitle: { fontSize: 18, fontWeight: '700' },
  placeholderSub: { fontSize: 14, textAlign: 'center' },
});
