/**
 * Checkout — port of PaymentsCheckoutView.swift.
 * The Payments hub's Checkout section: a Services / Products / Keypad tab picker,
 * a grid⇄list layout toggle, and the three tab bodies. Cart state lives in the
 * hub (payments.tsx) and is threaded in; tapping a card adds to cart, long-press
 * opens an Edit/Delete menu (Swift `.contextMenu`).
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import type {
  SelectedProductItem,
  SelectedServiceItem,
} from '@/models/cart';
import type { Product } from '@/models/product';
import type { Service } from '@/models/service';
import { useAppTheme } from '@/theme/theme-context';

export const BRAND_BLUE = '#6680F2';
export const BRAND_PURPLE = '#9966E6';
const BRAND_GRADIENT = [BRAND_BLUE, BRAND_PURPLE] as const;

export type CheckoutTab = 'Services' | 'Products' | 'Keypad';
export const CHECKOUT_TABS: CheckoutTab[] = ['Services', 'Products', 'Keypad'];

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDuration(mins: number): string {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function money0(n: number): string {
  return `$${n.toFixed(0)}`;
}

interface CheckoutProps {
  services: Service[];
  products: Product[];
  selectedServices: SelectedServiceItem[];
  selectedProducts: SelectedProductItem[];
  tab: CheckoutTab;
  onTabChange: (t: CheckoutTab) => void;
  showServiceList: boolean;
  showProductList: boolean;
  onToggleLayout: () => void;
  enteredAmount: string;
  onKey: (key: string) => void;
  onAddService: (s: Service) => void;
  onAddProduct: (p: Product) => void;
  onNewService: () => void;
  onNewProduct: () => void;
  onEditService: (s: Service) => void;
  onDeleteService: (s: Service) => void;
  onEditProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
}

export function Checkout(props: CheckoutProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { tab } = props;

  return (
    <View style={styles.flex}>
      {/* Tab picker */}
      <View style={styles.tabBarWrap}>
        <View style={[styles.tabBar, { backgroundColor: 'rgba(128,128,128,0.1)' }]}>
          {CHECKOUT_TABS.map((t) => {
            const active = tab === t;
            return (
              <Pressable key={t} style={styles.tabBtn} onPress={() => props.onTabChange(t)}>
                {active ? (
                  <LinearGradient
                    colors={BRAND_GRADIENT}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tabFill}>
                    <Text style={[styles.tabText, styles.tabTextActive]}>{t}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={[styles.tabText, { color: theme.secondaryText }]}>{t}</Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tab body + layout toggle overlay */}
      <View style={styles.flex}>
        {tab === 'Services' &&
          (props.showServiceList ? (
            <ServicesList {...props} />
          ) : (
            <ServicesGrid {...props} />
          ))}
        {tab === 'Products' &&
          (props.showProductList ? (
            <ProductsList {...props} />
          ) : (
            <ProductsGrid {...props} />
          ))}
        {tab === 'Keypad' && <Keypad enteredAmount={props.enteredAmount} onKey={props.onKey} />}

        {tab !== 'Keypad' && (
          <Pressable
            style={[styles.layoutToggle, { backgroundColor: theme.cardBackground, bottom: insets.bottom + 16 }]}
            onPress={props.onToggleLayout}>
            <LayoutToggleGlyph active={tab === 'Services' ? props.showServiceList : props.showProductList} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** The little grid/list stack glyph inside the layout toggle. */
function LayoutToggleGlyph({ active }: { active: boolean }) {
  return (
    <View style={styles.glyph}>
      <View style={{ width: 18, height: active ? 6 : 10, borderRadius: 2, backgroundColor: active ? BRAND_BLUE : '#999' }} />
      <View style={{ width: 18, height: active ? 6 : 10, borderRadius: 2, backgroundColor: active ? BRAND_PURPLE : '#999' }} />
    </View>
  );
}

// ── Context-menu shim (Swift `.contextMenu`) ──────────────────────────

function itemMenu(name: string, onEdit: () => void, onDelete: () => void) {
  Alert.alert(name, undefined, [
    { text: 'Edit', onPress: onEdit },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

// ── SERVICES ──────────────────────────────────────────────────────────

function ServicesGrid(props: CheckoutProps) {
  const theme = useAppTheme();
  const fillers = Math.max(0, 7 - props.services.length);
  const qty = (id: string) => props.selectedServices.find((s) => s.service.id === id)?.quantity ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.gridPad}>
      <View style={styles.grid}>
        <AddCard label="Add Service" sub="New service" onPress={props.onNewService} />
        {props.services.map((s) => (
          <GridCard
            key={s.id}
            name={s.name}
            color={s.colorHex}
            price={s.price}
            count={qty(s.id)}
            onPress={() => props.onAddService(s)}
            onLongPress={() => itemMenu(s.name, () => props.onEditService(s), () => props.onDeleteService(s))}
          />
        ))}
        {Array.from({ length: fillers }, (_, i) => (
          <View key={`f${i}`} style={[styles.emptyCard, { borderColor: theme.divider }]} />
        ))}
      </View>
    </ScrollView>
  );
}

function ServicesList(props: CheckoutProps) {
  const theme = useAppTheme();
  const buckets: { name: string; color: string; pred: (s: Service) => boolean }[] = [
    { name: 'Quick Services', color: '#33C773', pred: (s) => s.duration <= 30 },
    { name: 'Standard Services', color: BRAND_BLUE, pred: (s) => s.duration > 30 && s.duration <= 60 },
    { name: 'Extended Services', color: BRAND_PURPLE, pred: (s) => s.duration > 60 },
  ];
  const groups = buckets
    .map((b) => ({ ...b, items: props.services.filter(b.pred) }))
    .filter((g) => g.items.length > 0);
  const qty = (id: string) => props.selectedServices.find((s) => s.service.id === id)?.quantity ?? 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      <AddRow label="Add New Service" onPress={props.onNewService} />
      {props.services.length === 0 ? (
        <EmptyState icon="tray" title="No services yet" subtitle={'Tap Add New Service above\nto create your first service.'} />
      ) : (
        groups.map((g) => (
          <View key={g.name}>
            <SectionHeader title={g.name} color={g.color} count={g.items.length} />
            <View style={styles.listGroup}>
              {g.items.map((s) => (
                <ListRow
                  key={s.id}
                  name={s.name}
                  color={s.colorHex}
                  price={s.price}
                  qty={qty(s.id)}
                  meta={[
                    { icon: 'clock', text: formatDuration(s.duration) },
                    { icon: 'dollarsign.circle', text: money0(s.price) },
                  ]}
                  onPress={() => props.onAddService(s)}
                  onLongPress={() => itemMenu(s.name, () => props.onEditService(s), () => props.onDeleteService(s))}
                />
              ))}
            </View>
          </View>
        ))
      )}
      <View style={{ height: 1, backgroundColor: theme.divider, opacity: 0 }} />
    </ScrollView>
  );
}

// ── PRODUCTS ──────────────────────────────────────────────────────────

function ProductsGrid(props: CheckoutProps) {
  const theme = useAppTheme();
  const fillers = Math.max(0, 7 - props.products.length);
  const qty = (id: string) => props.selectedProducts.find((p) => p.product.id === id)?.quantity ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.gridPad}>
      <View style={styles.grid}>
        <AddCard label="Add Product" sub="New preset" onPress={props.onNewProduct} />
        {props.products.map((p) => (
          <GridCard
            key={p.id}
            name={p.name}
            color={p.colorHex}
            price={p.price}
            count={qty(p.id)}
            onPress={() => props.onAddProduct(p)}
            onLongPress={() => itemMenu(p.name, () => props.onEditProduct(p), () => props.onDeleteProduct(p))}
          />
        ))}
        {Array.from({ length: fillers }, (_, i) => (
          <View key={`f${i}`} style={[styles.emptyCard, { borderColor: theme.divider }]} />
        ))}
      </View>
    </ScrollView>
  );
}

function ProductsList(props: CheckoutProps) {
  const groups = Object.entries(
    props.products.reduce<Record<string, Product[]>>((acc, p) => {
      const key = p.category ?? 'Uncategorized';
      (acc[key] ??= []).push(p);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
  const qty = (id: string) => props.selectedProducts.find((p) => p.product.id === id)?.quantity ?? 0;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
      <AddRow label="Add New Product" onPress={props.onNewProduct} />
      {props.products.length === 0 ? (
        <EmptyState icon="bag" title="No products yet" subtitle={'Add products to quickly sell\nthem at checkout.'} />
      ) : (
        groups.map(([category, items]) => (
          <View key={category}>
            <SectionHeader title={category} color={BRAND_PURPLE} count={items.length} />
            <View style={styles.listGroup}>
              {items.map((p) => (
                <ListRow
                  key={p.id}
                  name={p.name}
                  color={p.colorHex}
                  price={p.price}
                  qty={qty(p.id)}
                  meta={[{ icon: 'dollarsign.circle', text: money0(p.price) }]}
                  onPress={() => props.onAddProduct(p)}
                  onLongPress={() => itemMenu(p.name, () => props.onEditProduct(p), () => props.onDeleteProduct(p))}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── KEYPAD ────────────────────────────────────────────────────────────

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['00', '0', '⌫'],
];

function Keypad({ enteredAmount, onKey }: { enteredAmount: string; onKey: (k: string) => void }) {
  const theme = useAppTheme();
  const display = `$${((Number(enteredAmount) || 0) / 100).toFixed(2)}`;
  return (
    <View style={styles.keypad}>
      <View style={styles.keypadDisplay}>
        <Text style={[styles.keypadLabel, { color: theme.secondaryText }]}>Enter Amount</Text>
        <Text style={[styles.keypadAmount, { color: theme.primaryText }]}>{display}</Text>
      </View>
      <View style={styles.keypadGrid}>
        {KEYPAD_ROWS.map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((key) => (
              <Pressable
                key={key}
                onPress={() => onKey(key)}
                style={[styles.key, { backgroundColor: theme.cardBackground }]}>
                {key === '⌫' ? (
                  <Icon name="delete.left.fill" size={24} color={theme.secondaryText} />
                ) : (
                  <Text style={[styles.keyText, { color: theme.primaryText }]}>{key}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Shared cards / rows ───────────────────────────────────────────────

function AddCard({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.card, styles.addCard]} onPress={onPress}>
      <View style={[styles.cardTop, { backgroundColor: 'rgba(102,128,242,0.12)' }]}>
        <Icon name="plus" size={30} color={BRAND_BLUE} weight="medium" />
      </View>
      <View style={[styles.cardBody, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.cardName, { color: BRAND_BLUE }]}>{label}</Text>
        <Text style={[styles.cardPrice, { color: theme.secondaryText }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function GridCard({
  name,
  color,
  price,
  count,
  onPress,
  onLongPress,
}: {
  name: string;
  color: string;
  price: number;
  count: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress}>
      <View style={[styles.cardTop, { backgroundColor: color }]}>
        <Text style={styles.cardInitials}>{initials(name)}</Text>
      </View>
      <View style={[styles.cardBody, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.cardName, { color: theme.primaryText }]} numberOfLines={2}>
          {name}
        </Text>
        <Text style={[styles.cardPrice, { color: theme.secondaryText }]}>{money0(price)}</Text>
      </View>
      {count > 0 && (
        <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{count}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.addRow, { backgroundColor: theme.cardBackground }]} onPress={onPress}>
      <Avatar color={BRAND_BLUE} icon="plus" />
      <Text style={[styles.addRowText, { color: BRAND_BLUE }]}>{label}</Text>
      <View style={styles.flex} />
      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

function ListRow({
  name,
  color,
  price,
  qty,
  meta,
  onPress,
  onLongPress,
}: {
  name: string;
  color: string;
  price: number;
  qty: number;
  meta: { icon: SFSymbol; text: string }[];
  onPress: () => void;
  onLongPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={[
        styles.listRow,
        { backgroundColor: theme.cardBackground, borderColor: qty > 0 ? 'rgba(102,128,242,0.3)' : 'transparent' },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}>
      <View style={[styles.listAccent, { backgroundColor: color }]} />
      <Avatar color={color} text={initials(name)} />
      <View style={styles.listText}>
        <Text style={[styles.listName, { color: theme.primaryText }]} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          {meta.map((m) => (
            <View key={m.icon} style={styles.metaItem}>
              <Icon name={m.icon} size={11} color={theme.secondaryText} />
              <Text style={[styles.metaText, { color: theme.secondaryText }]}>{m.text}</Text>
            </View>
          ))}
        </View>
      </View>
      {qty > 0 ? (
        <View style={styles.qtyInline}>
          <Text style={[styles.qtyMult, { color: BRAND_BLUE }]}>{qty}x</Text>
          <Text style={[styles.qtyTotal, { color: theme.primaryText }]}>{money0(price * qty)}</Text>
        </View>
      ) : (
        <Icon name="plus.circle.fill" size={24} color={'rgba(102,128,242,0.6)'} />
      )}
    </Pressable>
  );
}

function Avatar({ color, text, icon }: { color: string; text?: string; icon?: SFSymbol }) {
  return (
    <View style={[styles.avatar, { backgroundColor: withAlpha(color, 0.15) }]}>
      {icon ? (
        <Icon name={icon} size={18} color={color} weight="semibold" />
      ) : (
        <Text style={[styles.avatarText, { color }]}>{text}</Text>
      )}
    </View>
  );
}

function SectionHeader({ title, color, count }: { title: string; color: string; count: number }) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: color }]} />
      <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>{title}</Text>
      <View style={[styles.sectionCount, { backgroundColor: withAlpha(color, 0.8) }]}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
      <View style={[styles.sectionRule, { backgroundColor: theme.divider }]} />
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: SFSymbol; title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.emptyState}>
      <Icon name={icon} size={40} color={'rgba(150,150,150,0.5)'} />
      <Text style={[styles.emptyTitle, { color: theme.secondaryText }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: theme.secondaryText }]}>{subtitle}</Text>
    </View>
  );
}

/** Hex (#RRGGBB) → rgba string. Local copy to avoid importing the named tokens helper here. */
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Tab picker
  tabBarWrap: { paddingHorizontal: 16, paddingBottom: 10 },
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  tabFill: { alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabText: { fontSize: 14, fontWeight: '600', textAlign: 'center', paddingVertical: 10 },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700', paddingVertical: 0 },
  // Layout toggle
  layoutToggle: {
    position: 'absolute',
    left: 20,
    bottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  glyph: { gap: 3, alignItems: 'center' },
  // Grid
  gridPad: { padding: 16, paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 12, borderRadius: 12 },
  addCard: { borderWidth: 1.5, borderColor: 'rgba(102,128,242,0.3)', borderStyle: 'dashed', overflow: 'hidden' },
  cardTop: { height: 80, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  cardInitials: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  cardBody: { paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', gap: 4, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  cardName: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  cardPrice: { fontSize: 13, fontWeight: '600' },
  emptyCard: { width: '48%', height: 130, marginBottom: 12, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(150,150,150,0.08)' },
  qtyBadge: { position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  qtyBadgeText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  // List
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  addRowText: { fontSize: 16, fontWeight: '600' },
  listGroup: { gap: 8, paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingRight: 14, overflow: 'hidden' },
  listAccent: { width: 5, alignSelf: 'stretch', marginVertical: 6, borderRadius: 3 },
  listText: { flex: 1, gap: 4, paddingVertical: 14, paddingLeft: 14 },
  listName: { fontSize: 16, fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, fontWeight: '500' },
  qtyInline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  qtyMult: { fontSize: 14, fontWeight: '600' },
  qtyTotal: { fontSize: 16, fontWeight: '700' },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  sectionCount: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  sectionRule: { flex: 1, height: 1 },
  // Empty state
  emptyState: { alignItems: 'center', gap: 16, paddingTop: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  // Keypad
  keypad: { flex: 1, justifyContent: 'flex-end' },
  keypadDisplay: { alignItems: 'center', gap: 8, paddingVertical: 20, flex: 1, justifyContent: 'center' },
  keypadLabel: { fontSize: 14, fontWeight: '500' },
  keypadAmount: { fontSize: 56, fontWeight: '700' },
  keypadGrid: { gap: 16, paddingHorizontal: 30, paddingBottom: 20 },
  keypadRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  key: {
    width: 75,
    height: 75,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  keyText: { fontSize: 28, fontWeight: '500' },
});
