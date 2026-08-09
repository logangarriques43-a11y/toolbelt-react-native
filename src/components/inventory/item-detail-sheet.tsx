/**
 * Item Detail sheet — port of ItemDetailView.swift.
 * View / edit a single inventory item: status header, editable fields, quick
 * quantity adjust, stock details, save + delete, and a saved confirmation. The
 * "Find Vendors" CTA targets the Vendor marketplace (Phase 6d) — stubbed for now.
 */

import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { KeyboardAwareForm } from '@/components/keyboard-aware-form';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { itemTotalValue, statusColor, statusLabel, stockStatus, type InventoryItem } from '@/models/inventory';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const ADJUSTMENTS = [-10, -5, -1, 1, 5, 10];

export function ItemDetailSheet({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const theme = useAppTheme();
  const inventory = useInventory();

  const [editing, setEditing] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');

  const load = (it: InventoryItem) => {
    setName(it.name);
    setQuantity(String(it.quantity));
    setReorderLevel(String(it.reorderLevel));
    setPrice(it.unitPrice.toFixed(2));
    setCategory(it.category);
  };

  useEffect(() => {
    if (item) {
      load(item);
      setEditing(false);
      setShowSaved(false);
    }
  }, [item]);

  if (!item) return <Modal visible={false} transparent />;

  const status = stockStatus(item);
  const color = statusColor(status);

  const save = () => {
    inventory.updateItem({
      ...item,
      name,
      quantity: parseInt(quantity, 10) || item.quantity,
      reorderLevel: parseInt(reorderLevel, 10) || item.reorderLevel,
      unitPrice: Number(price) || item.unitPrice,
      category,
    });
    setShowSaved(true);
    setEditing(false);
  };

  const del = () => {
    Alert.alert('Delete Item', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { inventory.deleteItem(item.id); onClose(); } },
    ]);
  };

  const adjust = (amount: number) => setQuantity((q) => String(Math.max(0, (parseInt(q, 10) || 0) + amount)));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.action}>Close</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Item Details</Text>
          {showSaved ? (
            <Text style={[styles.action, styles.hidden]}>Edit</Text>
          ) : (
            <Pressable
              onPress={() => {
                if (editing) {
                  load(item);
                  setEditing(false);
                } else {
                  setEditing(true);
                  setShowSaved(false);
                }
              }}
              hitSlop={8}>
              <Text style={styles.action}>{editing ? 'Cancel' : 'Edit'}</Text>
            </Pressable>
          )}
        </View>

        {showSaved ? (
          <View style={styles.success}>
            <Icon name="checkmark.circle.fill" size={60} color={iOSColors.green} />
            <Text style={[styles.successTitle, { color: theme.primaryText }]}>Changes Saved!</Text>
            <View style={[styles.summary, { borderColor: theme.divider }]}>
              <SummaryRow label="Name" value={name} />
              <SummaryRow label="Quantity" value={quantity} />
              <SummaryRow label="Reorder Level" value={reorderLevel} />
              <SummaryRow label="Unit Price" value={`$${price}`} />
              <SummaryRow label="Category" value={category} />
            </View>
            <Pressable onPress={onClose} style={[styles.primaryBtn, { backgroundColor: iOSColors.blue }]}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </Pressable>
          </View>
        ) : (
          <KeyboardAwareForm contentContainerStyle={styles.body}>
            {/* Status header */}
            <View style={styles.headerBlock}>
              <View style={[styles.statusPill, { backgroundColor: withOpacity(color, 0.1) }]}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.statusText, { color }]}>{statusLabel(status)}</Text>
              </View>
              {!editing && (
                <>
                  <Text style={[styles.itemName, { color: theme.primaryText }]}>{item.name}</Text>
                  <Text style={[styles.itemSku, { color: theme.secondaryText }]}>{item.sku}</Text>
                </>
              )}
            </View>

            {/* Editable fields */}
            <Field label="Item Name">
              {editing ? (
                <Input value={name} onChangeText={setName} placeholder="Enter item name" />
              ) : (
                <ReadOnly value={name} />
              )}
            </Field>
            <View style={styles.row}>
              <Field label="Quantity" style={styles.flex}>
                {editing ? (
                  <Input value={quantity} onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                ) : (
                  <ReadOnly value={quantity} color={color} bold />
                )}
              </Field>
              <Field label="Reorder Level" style={styles.flex}>
                {editing ? (
                  <Input value={reorderLevel} onChangeText={(t) => setReorderLevel(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
                ) : (
                  <ReadOnly value={reorderLevel} bold />
                )}
              </Field>
            </View>
            <Field label="Unit Price">
              {editing ? (
                <Input value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" />
              ) : (
                <ReadOnly value={`$${price}`} />
              )}
            </Field>
            <Field label="Category">
              {editing ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                  {inventory.allCategories.map((cat) => {
                    const active = category === cat;
                    return (
                      <Pressable key={cat} onPress={() => setCategory(cat)} style={[styles.pill, { backgroundColor: active ? iOSColors.blue : 'transparent', borderColor: iOSColors.blue }]}>
                        <Text style={[styles.pillText, { color: active ? '#FFFFFF' : iOSColors.blue }]}>{cat}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={[styles.categoryBadge, { backgroundColor: withOpacity(iOSColors.blue, 0.8) }]}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              )}
            </Field>

            {editing ? (
              <View style={[styles.quickAdjust, { borderColor: withOpacity(iOSColors.blue, 0.1), backgroundColor: withOpacity(iOSColors.blue, 0.03) }]}>
                <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Quick Adjust Quantity</Text>
                <View style={styles.adjustRow}>
                  {ADJUSTMENTS.map((a) => (
                    <Pressable
                      key={a}
                      onPress={() => adjust(a)}
                      style={[styles.adjustBtn, { backgroundColor: withOpacity(a < 0 ? iOSColors.red : iOSColors.green, 0.08) }]}>
                      <Text style={[styles.adjustText, { color: a < 0 ? iOSColors.red : iOSColors.green }]}>{a > 0 ? `+${a}` : a}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.infoHead}>
                  <Icon name="info.circle.fill" size={14} color={theme.secondaryText} />
                  <Text style={[styles.infoTitle, { color: theme.primaryText }]}>Stock Details</Text>
                </View>
                <InfoRow label="Total Value" value={`$${itemTotalValue(item).toFixed(2)}`} />
                <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
                <InfoRow label="Units Until Reorder" value={String(Math.max(0, item.quantity - item.reorderLevel))} />
                <View style={[styles.infoDivider, { backgroundColor: theme.divider }]} />
                <InfoRow label="SKU" value={item.sku || '—'} />
              </View>
            )}

            {!editing && (
              <Pressable
                onPress={() => Alert.alert('Find Vendors', 'The Vendor marketplace arrives in Phase 6d.')}
                style={[styles.vendorBtn, { backgroundColor: iOSColors.blue }]}>
                <Icon name="storefront.fill" size={18} color="#FFFFFF" />
                <View style={styles.flex}>
                  <Text style={styles.vendorTitle}>Find Vendors for This Item</Text>
                  <Text style={styles.vendorSub} numberOfLines={1}>Search nearby suppliers for {item.name}</Text>
                </View>
                <Icon name="chevron.right" size={14} color="#FFFFFF" weight="semibold" />
              </Pressable>
            )}

            {editing && (
              <View style={styles.actions}>
                <Pressable onPress={save} style={[styles.primaryBtn, { backgroundColor: iOSColors.blue }]}>
                  <Text style={styles.primaryBtnText}>Save Changes</Text>
                </Pressable>
                <Pressable onPress={del} style={[styles.deleteBtn, { backgroundColor: withOpacity(iOSColors.red, 0.08) }]}>
                  <Text style={[styles.deleteText, { color: iOSColors.red }]}>Delete Item</Text>
                </Pressable>
              </View>
            )}
          </KeyboardAwareForm>
        )}
      </View>
    </Modal>
  );
}

function Field({ label, children, style }: { label: string; children: ReactNode; style?: object }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.field, style]}>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      {children}
    </View>
  );
}

function Input(props: ComponentProps<typeof TextInput>) {
  const theme = useAppTheme();
  return <TextInput {...props} placeholderTextColor={theme.secondaryText} style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]} />;
}

function ReadOnly({ value, color, bold }: { value: string; color?: string; bold?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.readonly, { backgroundColor: withOpacity(iOSColors.gray, 0.05) }]}>
      <Text style={[bold ? styles.readonlyBold : styles.readonlyText, { color: color ?? theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.5)', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  action: { fontSize: 16, color: iOSColors.blue },
  hidden: { opacity: 0 },
  body: { padding: 16, gap: 14 },
  headerBlock: { alignItems: 'center', gap: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusText: { fontSize: 14, fontWeight: '600' },
  itemName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  itemSku: { fontSize: 14 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  readonly: { padding: 14, borderRadius: 10 },
  readonlyText: { fontSize: 16 },
  readonlyBold: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  pills: { gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 14, fontWeight: '500' },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  categoryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  quickAdjust: { padding: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  adjustRow: { flexDirection: 'row', gap: 10 },
  adjustBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  adjustText: { fontSize: 14, fontWeight: '600' },
  infoCard: { borderRadius: 12, padding: 14, gap: 0 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 12 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoDivider: { height: StyleSheet.hairlineWidth },
  vendorBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12 },
  vendorTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  vendorSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  actions: { gap: 10 },
  primaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, alignSelf: 'stretch' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  deleteBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: 12 },
  deleteText: { fontSize: 16, fontWeight: '500' },
  success: { padding: 24, alignItems: 'center', gap: 16 },
  successTitle: { fontSize: 22, fontWeight: '700' },
  summary: { alignSelf: 'stretch', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
});
