/**
 * Manual Re-order sheet — port of ManualReorderView.swift.
 * Pick an item (low/out-of-stock first) → enter how many units arrived → adds to
 * stock (logging an incoming entry) → success. If the item has a saved re-order
 * URL, offers a one-tap "Re-order on Vendor Site" (opens it). The email-to-vendor
 * fallback needs the Vendor records (Phase 6d) + a native mail composer — deferred.
 */

import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { statusColor, statusLabel, stockStatus, type InventoryItem } from '@/models/inventory';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PRIORITY = { outOfStock: 0, lowStock: 1, inStock: 2 } as const;

export function ManualReorderSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const inventory = useInventory();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState('');
  const [search, setSearch] = useState('');
  const [didSave, setDidSave] = useState(false);

  const selected = selectedId ? inventory.items.find((i) => i.id === selectedId) ?? null : null;

  const close = () => {
    onClose();
    setTimeout(() => {
      setSelectedId(null);
      setQuantityText('');
      setSearch('');
      setDidSave(false);
    }, 250);
  };

  const sorted = [...inventory.items]
    .sort((a, b) => {
      const pa = PRIORITY[stockStatus(a)];
      const pb = PRIORITY[stockStatus(b)];
      return pa !== pb ? pa - pb : a.name.localeCompare(b.name);
    })
    .filter((i) => (search.trim() ? i.name.toLowerCase().includes(search.trim().toLowerCase()) : true));

  const pick = (item: InventoryItem) => {
    setSelectedId(item.id);
    const def = item.reorderQuantity ?? item.reorderLevel;
    setQuantityText(def > 0 ? String(def) : '');
  };

  const save = () => {
    const qty = parseInt(quantityText, 10);
    if (!selected || !(qty > 0)) return;
    inventory.addStock(selected.id, qty);
    setDidSave(true);
  };

  const qtyValid = (parseInt(quantityText, 10) || 0) > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={close} hitSlop={8}>
            <Text style={styles.action}>Cancel</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]} numberOfLines={1}>
            {selected ? `Re-order ${selected.name}` : 'Manual Re-order'}
          </Text>
          <Text style={[styles.action, styles.hidden]}>Cancel</Text>
        </View>

        {didSave ? (
          <View style={styles.success}>
            <Icon name="checkmark.circle.fill" size={56} color={iOSColors.green} />
            <Text style={[styles.successTitle, { color: theme.primaryText }]}>Stock updated</Text>
            {selected && <Text style={[styles.successSub, { color: theme.secondaryText }]}>{selected.name} now shows {selected.quantity} in stock.</Text>}
            <View style={styles.row}>
              <Pressable onPress={() => { setDidSave(false); setSelectedId(null); setQuantityText(''); }} style={[styles.outlineBtn, { borderColor: iOSColors.blue }]}>
                <Text style={[styles.outlineBtnText, { color: iOSColors.blue }]}>Re-order another</Text>
              </Pressable>
              <Pressable onPress={close} style={[styles.primaryBtn, styles.flex, { backgroundColor: iOSColors.blue }]}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        ) : selected ? (
          <KeyboardAwareForm contentContainerStyle={styles.body}>
            <View style={styles.center}>
              <Icon name="arrow.triangle.2.circlepath.circle.fill" size={44} color={iOSColors.blue} />
            </View>
            <View style={[styles.stockCard, { backgroundColor: theme.divider }]}>
              <Text style={[styles.stockLabel, { color: theme.secondaryText }]}>Current stock</Text>
              <View style={styles.stockRow}>
                <Text style={[styles.stockValue, { color: theme.primaryText }]}>{selected.quantity}</Text>
                <View style={[styles.statusBadge, { backgroundColor: withOpacity(statusColor(stockStatus(selected)), 0.12) }]}>
                  <Text style={[styles.statusText, { color: statusColor(stockStatus(selected)) }]}>{statusLabel(stockStatus(selected))}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>How many units did you re-order?</Text>
            <TextInput
              value={quantityText}
              onChangeText={(t) => setQuantityText(t.replace(/[^0-9]/g, ''))}
              placeholder="e.g. 10"
              placeholderTextColor={theme.secondaryText}
              keyboardType="number-pad"
              style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]}
            />
            {selected.reorderQuantity != null && (
              <Text style={[styles.hint, { color: theme.secondaryText }]}>Default re-order quantity is {selected.reorderQuantity}.</Text>
            )}
            <Text style={[styles.hint, { color: theme.secondaryText }]}>This adds the units to your stock and logs an incoming entry in Activity.</Text>

            {selected.reorderURL && (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(selected.reorderURL!)} style={[styles.vendorBtn, { backgroundColor: iOSColors.indigo }]}>
                <Icon name="arrow.up.right.square.fill" size={16} color="#FFFFFF" />
                <Text style={styles.vendorBtnText}>Re-order on Vendor Site</Text>
              </Pressable>
            )}

            <Pressable onPress={save} disabled={!qtyValid} style={[styles.primaryBtn, { backgroundColor: qtyValid ? iOSColors.blue : withOpacity(iOSColors.blue, 0.4) }]}>
              <Text style={styles.primaryBtnText}>Add to Stock</Text>
            </Pressable>
            <Pressable onPress={() => { setSelectedId(null); setQuantityText(''); }}>
              <Text style={[styles.link, { color: iOSColors.blue }]}>Pick a different item</Text>
            </Pressable>
          </KeyboardAwareForm>
        ) : (
          <View style={styles.picker}>
            <View style={[styles.searchBar, { backgroundColor: theme.divider }]}>
              <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search items" placeholderTextColor={theme.secondaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
            </View>
            {sorted.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="shippingbox" size={44} color={withOpacity(iOSColors.gray, 0.5)} />
                <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                  {inventory.items.length === 0 ? 'Add items to inventory first.' : 'No items match your search.'}
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.list}>
                {sorted.map((item) => {
                  const color = statusColor(stockStatus(item));
                  return (
                    <Pressable key={item.id} onPress={() => pick(item)} style={[styles.itemRow, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}>
                      <View style={[styles.itemIcon, { backgroundColor: withOpacity(color, 0.15) }]}>
                        <Icon name="shippingbox.fill" size={18} color={color} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.itemName, { color: theme.primaryText }]}>{item.name}</Text>
                        <Text style={[styles.itemSub, { color: theme.secondaryText }]}>In stock: {item.quantity} · Re-order level: {item.reorderLevel}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: withOpacity(color, 0.12) }]}>
                        <Text style={[styles.statusText, { color }]}>{statusLabel(stockStatus(item))}</Text>
                      </View>
                      <Icon name="chevron.right" size={12} color={theme.secondaryText} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.5)', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  action: { fontSize: 16, color: iOSColors.blue, minWidth: 56 },
  hidden: { opacity: 0 },
  picker: { flex: 1, gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 10, marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  itemIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  body: { padding: 16, gap: 16 },
  stockCard: { padding: 16, borderRadius: 12, gap: 6 },
  stockLabel: { fontSize: 13 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stockValue: { fontSize: 28, fontWeight: '700' },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  hint: { fontSize: 12 },
  vendorBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12 },
  vendorBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  link: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  successTitle: { fontSize: 20, fontWeight: '700' },
  successSub: { fontSize: 14, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', marginTop: 8 },
  outlineBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  outlineBtnText: { fontSize: 16, fontWeight: '500' },
});
