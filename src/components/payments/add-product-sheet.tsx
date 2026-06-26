/**
 * Add / Edit Product sheet — port of AddProductSheet.swift.
 * Preview card + Basic info / Pricing (with margin) / Inventory / Sales tax /
 * Description, and a delete affordance when editing. Writes through the products
 * store. The "Also add to inventory?" linkage (InventoryServiceLinkSheet) is
 * deferred to Phase 6 — stock here is a plain per-product counter.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { BRAND_BLUE, BRAND_PURPLE } from '@/components/payments/checkout';
import { ColorPickerSheet } from '@/components/sheets/color-picker-sheet';
import { useProducts } from '@/context/products-store';
import { withOpacity } from '@/lib/color';
import { DEFAULT_PRODUCT_COLOR, type Product } from '@/models/product';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const GREEN = '#33C773';

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AddProductSheet({
  visible,
  editingProduct,
  onClose,
}: {
  visible: boolean;
  editingProduct: Product | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const store = useProducts();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_PRODUCT_COLOR);
  const [category, setCategory] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [trackInventory, setTrackInventory] = useState(false);
  const [salesTaxEnabled, setSalesTaxEnabled] = useState(false);
  const [salesTaxRate, setSalesTaxRate] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const numStr = (n: number) => (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2));

  useEffect(() => {
    if (!visible) return;
    const p = editingProduct;
    setName(p?.name ?? '');
    setPrice(p ? numStr(p.price) : '');
    setCostPrice(p?.costPrice != null ? numStr(p.costPrice) : '');
    setColor(p?.colorHex ?? DEFAULT_PRODUCT_COLOR);
    setCategory(p?.category ?? '');
    setSku(p?.sku ?? '');
    setDescription(p?.description ?? '');
    setStockQuantity(p?.stockQuantity != null ? String(p.stockQuantity) : '');
    setTrackInventory(p?.trackInventory ?? false);
    setSalesTaxEnabled(p?.salesTaxEnabled ?? false);
    setSalesTaxRate(p && p.salesTaxRate > 0 ? numStr(p.salesTaxRate) : '');
  }, [visible, editingProduct]);

  const parsedPrice = Number(price) || 0;
  const parsedCost = costPrice ? Number(costPrice) || 0 : undefined;
  const isValid = name.trim().length > 0 && parsedPrice > 0;
  const profit = parsedCost != null && parsedCost > 0 && parsedPrice > 0 ? parsedPrice - parsedCost : null;
  const margin = profit != null ? (profit / parsedPrice) * 100 : null;
  const taxRate = Number(salesTaxRate) || 0;

  const save = () => {
    if (!isValid) return;
    const payload: Omit<Product, 'id'> = {
      name: name.trim(),
      colorHex: color,
      price: parsedPrice,
      costPrice: parsedCost,
      category: category.trim() || undefined,
      sku: sku.trim() || undefined,
      description: description.trim() || undefined,
      stockQuantity: trackInventory ? (stockQuantity ? parseInt(stockQuantity, 10) : 0) : undefined,
      trackInventory,
      salesTaxEnabled,
      salesTaxRate: salesTaxEnabled ? taxRate : 0,
    };
    if (editingProduct) store.updateProduct(editingProduct.id, payload);
    else store.addProduct(payload);
    onClose();
  };

  const confirmDelete = () => {
    if (!editingProduct) return;
    Alert.alert('Delete Product', 'Are you sure you want to delete this product? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          store.deleteProduct(editingProduct.id);
          onClose();
        },
      },
    ]);
  };

  const lowStock = trackInventory && stockQuantity !== '' && Number(stockQuantity) > 0 && Number(stockQuantity) <= 5;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.cardBackground }]}>
              <Icon name="xmark" size={16} color={theme.secondaryText} weight="medium" />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </Text>
            <View style={styles.roundBtn} />
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {/* Preview */}
            <View style={styles.previewWrap}>
              <View style={[styles.previewCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <View style={[styles.previewTop, { backgroundColor: color }]}>
                  <Text style={styles.previewInitials}>{initials(name || 'Product')}</Text>
                </View>
                <View style={styles.previewBody}>
                  <Text style={[styles.previewName, { color: name ? theme.primaryText : theme.secondaryText }]} numberOfLines={2}>
                    {name || 'Product Name'}
                  </Text>
                  <Text style={[styles.previewPrice, { color: theme.secondaryText }]}>
                    ${parsedPrice > 0 ? parsedPrice.toFixed(2) : '0.00'}
                  </Text>
                  {margin != null && <Text style={[styles.previewMargin, { color: GREEN }]}>{margin.toFixed(1)}% margin</Text>}
                </View>
              </View>
            </View>

            {/* Basic info */}
            <Section title="Basic info">
              <LabeledInput label="Product Name" value={name} onChange={setName} placeholder="e.g., Shampoo, Hair Oil" />
              <Pressable
                style={[styles.rowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}
                onPress={() => setShowColorPicker(true)}>
                <View style={[styles.colorDot, { backgroundColor: color }]} />
                <View style={styles.flex}>
                  <Text style={[styles.smallLabel, { color: theme.secondaryText }]}>Color</Text>
                  <Text style={[styles.rowValue, { color: theme.primaryText }]}>Selected color</Text>
                </View>
                <Icon name="chevron.right" size={14} color={theme.secondaryText} />
              </Pressable>
              <LabeledInput label="Category" value={category} onChange={setCategory} placeholder="e.g., Hair Care, Skin Care" />
              <LabeledInput label="SKU (Optional)" value={sku} onChange={setSku} placeholder="e.g., SHP-001" autoCapitalize="characters" />
            </Section>

            {/* Pricing */}
            <Section title="Pricing">
              <View style={styles.priceRow}>
                <PriceInput label="Sell Price" value={price} onChange={(t) => setPrice(filterDecimal(t))} />
                <PriceInput label="Cost Price" value={costPrice} onChange={(t) => setCostPrice(filterDecimal(t))} />
              </View>
              {profit != null && margin != null && (
                <View style={styles.profitRow}>
                  <Icon name="chart.line.uptrend.xyaxis" size={14} color={profit >= 0 ? GREEN : iOSColors.red} />
                  <Text style={[styles.profitText, { color: theme.primaryText }]}>Profit: ${profit.toFixed(2)}</Text>
                  <Text style={[styles.profitMargin, { color: profit >= 0 ? GREEN : iOSColors.red }]}>
                    ({margin.toFixed(1)}% margin)
                  </Text>
                </View>
              )}
            </Section>

            {/* Inventory */}
            <Section title="Inventory">
              <ToggleRow
                icon="shippingbox"
                title="Track inventory"
                value={trackInventory}
                onChange={setTrackInventory}
                info="When enabled, stock quantity is tracked and decremented after each sale."
              />
              {trackInventory && (
                <>
                  <LabeledInput
                    label="Stock Quantity"
                    value={stockQuantity}
                    onChange={(t) => setStockQuantity(t.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    keyboardType="number-pad"
                  />
                  {lowStock && (
                    <View style={styles.inlineNote}>
                      <Icon name="exclamationmark.triangle.fill" size={14} color={withOpacity(iOSColors.orange, 0.7)} />
                      <Text style={[styles.inlineNoteText, { color: theme.secondaryText }]}>
                        Low stock warning — consider reordering soon
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Section>

            {/* Sales tax */}
            <Section title="Sales tax">
              <ToggleRow
                icon="percent"
                title="Charge sales tax"
                value={salesTaxEnabled}
                onChange={setSalesTaxEnabled}
                info="When enabled, sales tax is applied to this product at checkout."
              />
              {salesTaxEnabled && (
                <>
                  <View style={[styles.taxInputCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                    <Text style={[styles.smallLabel, { color: theme.secondaryText }]}>Tax Rate</Text>
                    <View style={styles.taxInputRow}>
                      <TextInput
                        value={salesTaxRate}
                        onChangeText={(t) => setSalesTaxRate(filterDecimal(t))}
                        placeholder="0"
                        placeholderTextColor={theme.secondaryText}
                        keyboardType="decimal-pad"
                        style={[styles.rowValue, styles.flex, { color: theme.primaryText }]}
                      />
                      <Text style={[styles.percent, { color: theme.secondaryText }]}>%</Text>
                    </View>
                  </View>
                  {taxRate > 0 && parsedPrice > 0 && (
                    <View style={styles.inlineNote}>
                      <Icon name="info.circle.fill" size={14} color={withOpacity(iOSColors.blue, 0.7)} />
                      <Text style={[styles.inlineNoteText, { color: theme.secondaryText }]}>
                        Tax: ${(parsedPrice * (taxRate / 100)).toFixed(2)} — Total: $
                        {(parsedPrice * (1 + taxRate / 100)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </Section>

            {/* Description */}
            <Section title="Description">
              <View style={[styles.notesCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add a description for this product..."
                  placeholderTextColor={withOpacity(iOSColors.gray, 0.5)}
                  multiline
                  style={[styles.notesInput, { color: theme.primaryText }]}
                />
              </View>
            </Section>

            {editingProduct && (
              <Pressable style={[styles.deleteBtn, { backgroundColor: withOpacity(iOSColors.red, 0.08) }]} onPress={confirmDelete}>
                <Icon name="trash.fill" size={16} color={iOSColors.red} />
                <Text style={[styles.deleteText, { color: iOSColors.red }]}>Delete Product</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Save */}
          <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={save} disabled={!isValid}>
              {isValid ? (
                <LinearGradient colors={[BRAND_BLUE, BRAND_PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
                  <Icon name={editingProduct ? 'checkmark.circle.fill' : 'plus.circle.fill'} size={18} color="#FFFFFF" />
                  <Text style={styles.saveText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.saveBtn, { backgroundColor: withOpacity(iOSColors.gray, 0.4) }]}>
                  <Icon name={editingProduct ? 'checkmark.circle.fill' : 'plus.circle.fill'} size={18} color="#FFFFFF" />
                  <Text style={styles.saveText}>{editingProduct ? 'Update Product' : 'Add Product'}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </DashboardGradient>

      <ColorPickerSheet
        visible={showColorPicker}
        selected={color}
        onSelect={setColor}
        onClose={() => setShowColorPicker(false)}
      />
    </Modal>
  );
}

function filterDecimal(text: string): string {
  return text.replace(/[^0-9.]/g, '');
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      {children}
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'characters';
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.inputCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Text style={[styles.smallLabel, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.secondaryText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        style={[styles.rowValue, { color: theme.primaryText }]}
      />
    </View>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.inputCard, styles.flex, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Text style={[styles.smallLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.priceInputRow}>
        <Text style={[styles.rowValue, { color: theme.secondaryText }]}>$</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={theme.secondaryText}
          keyboardType="decimal-pad"
          style={[styles.rowValue, styles.flex, { color: theme.primaryText }]}
        />
      </View>
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  value,
  onChange,
  info,
}: {
  icon: SFSymbol;
  title: string;
  value: boolean;
  onChange: (v: boolean) => void;
  info?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.rowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.toggleIcon, { backgroundColor: withOpacity(BRAND_BLUE, 0.12) }]}>
        <Icon name={icon} size={16} color={BRAND_BLUE} />
      </View>
      <Text style={[styles.rowValue, styles.flex, { color: theme.primaryText }]}>{title}</Text>
      {info && (
        <Pressable hitSlop={8} onPress={() => Alert.alert(title, info)}>
          <Icon name="info.circle" size={16} color={theme.secondaryText} />
        </Pressable>
      )}
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, paddingBottom: 100, gap: 24 },
  // Preview
  previewWrap: { alignItems: 'center' },
  previewCard: { width: 160, borderRadius: 12, overflow: 'hidden' },
  previewTop: { height: 80, alignItems: 'center', justifyContent: 'center' },
  previewInitials: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  previewBody: { paddingHorizontal: 8, paddingVertical: 12, alignItems: 'center', gap: 4 },
  previewName: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  previewPrice: { fontSize: 13, fontWeight: '600' },
  previewMargin: { fontSize: 11, fontWeight: '500' },
  // Sections
  section: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  inputCard: { padding: 14, borderRadius: 12, gap: 4 },
  smallLabel: { fontSize: 12 },
  rowValue: { fontSize: 16 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  colorDot: { width: 24, height: 24, borderRadius: 12 },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  profitRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  profitText: { fontSize: 13, fontWeight: '500' },
  profitMargin: { fontSize: 13 },
  toggleIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  inlineNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  inlineNoteText: { fontSize: 12, flex: 1 },
  taxInputCard: { padding: 14, borderRadius: 12, gap: 4 },
  taxInputRow: { flexDirection: 'row', alignItems: 'center' },
  percent: { fontSize: 16, fontWeight: '500' },
  notesCard: { borderRadius: 12, padding: 12 },
  notesInput: { fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 12 },
  deleteText: { fontSize: 16, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  saveText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
});
