/**
 * My Products — port of MyVendorProductsView.swift + its editor sheet.
 * Lets a registered vendor add / edit / delete the products they resell through
 * the marketplace. In-memory via the vendor store (real catalog is backend-synced).
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { useVendors } from '@/context/vendor-store';
import { withOpacity } from '@/lib/color';
import { vendorProductPriceDisplay, vendorStatusColor, type VendorProduct } from '@/models/vendor';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const UNIT_OPTIONS = ['each', 'bottle', 'case', 'kg', 'lb', 'oz', 'g', 'ml', 'L', 'box', 'pack'];

export default function MyVendorProducts() {
  const theme = useAppTheme();
  const router = useRouter();
  const vendors = useVendors();
  const my = vendors.myVendor;
  const products = my ? vendors.productsFor(my.id) : [];
  const [editor, setEditor] = useState<{ open: boolean; product: VendorProduct | null }>({ open: false, product: null });

  const statusBanner = (() => {
    if (!my || my.status === 'verified') return null;
    const map: Record<string, string> = {
      pending: 'Your vendor application is pending. Products you add now go live when approved.',
      rejected: "Your vendor application was rejected. Products won't be visible to buyers.",
      suspended: "Your vendor listing is suspended. Products aren't visible to buyers.",
    };
    return { msg: map[my.status] ?? '', color: vendorStatusColor(my.status) };
  })();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.7) }]}>
        <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
          <Icon name="house.fill" size={20} color={iOSColors.blue} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>My Products</Text>
        {my ? (
          <Pressable onPress={() => setEditor({ open: true, product: null })} hitSlop={8} style={styles.addBtn}>
            <Icon name="plus" size={18} color={iOSColors.blue} weight="bold" />
          </Pressable>
        ) : (
          <View style={styles.addBtn} />
        )}
      </View>

      {!my ? (
        <View style={styles.empty}>
          <Icon name="storefront" size={56} color={withOpacity(iOSColors.gray, 0.4)} />
          <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No vendor registered yet</Text>
          <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Register your business as a vendor first, then come back to list your products.</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="shippingbox" size={56} color={withOpacity(iOSColors.gray, 0.4)} />
          <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No products yet</Text>
          <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Tap + to add the first product you sell through your vendor listing.</Text>
          {statusBanner && <Text style={[styles.emptyStatus, { color: statusBanner.color }]}>{statusBanner.msg}</Text>}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {statusBanner && (
            <View style={[styles.banner, { backgroundColor: withOpacity(statusBanner.color, 0.1) }]}>
              <Text style={[styles.bannerText, { color: statusBanner.color }]}>{statusBanner.msg}</Text>
            </View>
          )}
          {products.map((p) => (
            <Pressable key={p.id} style={[styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={() => setEditor({ open: true, product: p })}>
              <View style={[styles.rowIcon, { backgroundColor: withOpacity(iOSColors.indigo, 0.12) }]}>
                <Icon name="cube.box.fill" size={20} color={iOSColors.indigo} />
              </View>
              <View style={styles.flex}>
                <View style={styles.rowNameRow}>
                  <Text style={[styles.rowName, { color: theme.primaryText }]}>{p.name}</Text>
                  {!p.isActive && (
                    <View style={[styles.hidden, { backgroundColor: withOpacity(iOSColors.gray, 0.18) }]}>
                      <Text style={[styles.hiddenText, { color: iOSColors.gray }]}>HIDDEN</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.rowMeta, { color: theme.secondaryText }]}>
                  {vendorProductPriceDisplay(p)} / {p.unit}
                  {p.stockQuantity != null ? ` · ${p.stockQuantity} in stock` : ''}
                </Text>
              </View>
              <Icon name="chevron.right" size={12} color={theme.secondaryText} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {my && (
        <ProductEditor
          visible={editor.open}
          product={editor.product}
          vendorId={my.id}
          onClose={() => setEditor({ open: false, product: null })}
        />
      )}
    </SafeAreaView>
  );
}

function ProductEditor({ visible, product, vendorId, onClose }: { visible: boolean; product: VendorProduct | null; vendorId: string; onClose: () => void }) {
  const theme = useAppTheme();
  const vendors = useVendors();
  const editing = product != null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('each');
  const [stock, setStock] = useState('');
  const [moq, setMoq] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [tags, setTags] = useState('');
  const [showUnit, setShowUnit] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setSku(product?.sku ?? '');
    setPrice(product && product.price > 0 ? product.price.toFixed(2) : '');
    setUnit(product?.unit ?? 'each');
    setStock(product?.stockQuantity != null ? String(product.stockQuantity) : '');
    setMoq(product ? String(product.minimumOrderQuantity) : '1');
    setIsActive(product?.isActive ?? true);
    setTags(product?.categoryTags.join(', ') ?? '');
  }, [visible, product]);

  const canSave = name.trim().length > 0 && (parseInt(moq, 10) || 0) >= 1;

  const save = () => {
    if (!canSave) return;
    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const fields = {
      name: name.trim(),
      description: description.trim(),
      sku: sku.trim(),
      categoryTags: tagList,
      price: Number(price) || 0,
      currency: 'USD',
      unit,
      stockQuantity: stock ? parseInt(stock, 10) : undefined,
      minimumOrderQuantity: Math.max(1, parseInt(moq, 10) || 1),
      isActive,
    };
    if (editing && product) vendors.updateVendorProduct({ ...product, ...fields });
    else vendors.addVendorProduct({ ...fields, vendorId });
    onClose();
  };

  const del = () => {
    if (!product) return;
    Alert.alert('Delete this product?', "This removes the listing from your vendor catalog. You can't undo this.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { vendors.deleteVendorProduct(product.id); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <View style={[styles.editorHeader, { borderBottomColor: theme.divider }]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancel, { color: iOSColors.blue }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{editing ? 'Edit Product' : 'New Product'}</Text>
          <Pressable onPress={save} disabled={!canSave} hitSlop={8}>
            <Text style={[styles.save, { color: canSave ? iOSColors.blue : iOSColors.gray }]}>Save</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.editorBody}>
          <EField label="Name" value={name} onChangeText={setName} placeholder="Product name" />
          <EField label="Description" value={description} onChangeText={setDescription} placeholder="Short description" multiline />
          <EField label="SKU (optional)" value={sku} onChangeText={setSku} placeholder="SKU" autoCapitalize="characters" />
          <View style={styles.editRow}>
            <View style={styles.flex}>
              <EField label="Price ($)" value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))} placeholder="0.00" keyboardType="decimal-pad" />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Unit</Text>
              <Pressable onPress={() => setShowUnit(true)} style={[styles.input, styles.unitBtn, { backgroundColor: theme.cardBackground, borderColor: withOpacity(iOSColors.gray, 0.2) }]}>
                <Text style={{ color: theme.primaryText, fontSize: 15 }}>{unit}</Text>
                <Icon name="chevron.up.chevron.down" size={11} color={theme.secondaryText} />
              </Pressable>
            </View>
          </View>
          <View style={styles.editRow}>
            <View style={styles.flex}>
              <EField label="Stock (optional)" value={stock} onChangeText={(t) => setStock(t.replace(/[^0-9]/g, ''))} placeholder="—" keyboardType="number-pad" />
            </View>
            <View style={styles.flex}>
              <EField label="Min order qty" value={moq} onChangeText={(t) => setMoq(t.replace(/[^0-9]/g, ''))} placeholder="1" keyboardType="number-pad" />
            </View>
          </View>
          <EField label="Categories (comma separated)" value={tags} onChangeText={setTags} placeholder="hair, shampoo" autoCapitalize="none" />
          <View style={[styles.toggleRow, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.toggleTitle, styles.flex, { color: theme.primaryText }]}>Listed for buyers</Text>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
          {editing && (
            <Pressable onPress={del} style={[styles.deleteBtn, { backgroundColor: withOpacity(iOSColors.red, 0.08) }]}>
              <Text style={[styles.deleteText, { color: iOSColors.red }]}>Delete Product</Text>
            </Pressable>
          )}
        </ScrollView>

        <OptionSheet
          visible={showUnit}
          title="Unit"
          options={UNIT_OPTIONS.map((u) => ({ label: u, value: u }))}
          selected={unit}
          onSelect={(v) => setUnit(String(v))}
          onClose={() => setShowUnit(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}

function EField({ label, multiline, ...props }: { label: string; multiline?: boolean } & import('react').ComponentProps<typeof TextInput>) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.secondaryText}
        style={[multiline ? styles.inputMultiline : styles.input, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: withOpacity(iOSColors.gray, 0.2) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: { minWidth: 70, alignItems: 'flex-end' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  emptyStatus: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  list: { padding: 16, gap: 10 },
  banner: { padding: 14, borderRadius: 10 },
  bannerText: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  rowNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowName: { fontSize: 16, fontWeight: '600' },
  hidden: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  hiddenText: { fontSize: 9, fontWeight: '700' },
  rowMeta: { fontSize: 13, marginTop: 4 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  cancel: { fontSize: 16 },
  save: { fontSize: 16, fontWeight: '600' },
  editorBody: { padding: 20, gap: 14 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500' },
  input: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, fontSize: 15 },
  inputMultiline: { minHeight: 70, padding: 10, borderRadius: 10, borderWidth: 1, fontSize: 15, textAlignVertical: 'top' },
  editRow: { flexDirection: 'row', gap: 12 },
  unitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 10 },
  toggleTitle: { fontSize: 15, fontWeight: '500' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 4 },
  deleteText: { fontSize: 16, fontWeight: '600' },
});
