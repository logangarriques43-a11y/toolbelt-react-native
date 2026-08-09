/**
 * Add Item sheet — port of AddItemManuallyView.swift (basic-info step).
 * Bottom-sheet form to create an inventory item, then a success summary. The
 * Swift flow has a second "Services & Re-order" step (InventoryServiceLinkSheet)
 * before saving — that lands in 6b-ii; here "Add Item" saves directly.
 */

import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ServiceLinkContent } from '@/components/inventory/service-link-sheet';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function AddItemSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const inventory = useInventory();

  const [step, setStep] = useState<'form' | 'services' | 'success'>('form');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [category, setCategory] = useState('General');

  const reset = () => {
    setName('');
    setSku('');
    setQuantity('');
    setPrice('');
    setReorderLevel('');
    setCategory('General');
    setStep('form');
  };

  const close = () => {
    onClose();
    setTimeout(reset, 250);
  };

  const draft = {
    name: name.trim(),
    sku: sku.trim(),
    quantity: parseInt(quantity, 10) || 0,
    reorderLevel: parseInt(reorderLevel, 10) || 10,
    unitPrice: Number(price) || 0,
    category,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          {step === 'services' ? (
            <Pressable onPress={() => setStep('form')} hitSlop={8}>
              <Text style={styles.action}>Back</Text>
            </Pressable>
          ) : (
            <Pressable onPress={close} hitSlop={8}>
              <Text style={styles.action}>Cancel</Text>
            </Pressable>
          )}
          <Text style={[styles.title, { color: theme.primaryText }]}>
            {step === 'success' ? 'Added' : step === 'services' ? 'Services & Re-order' : 'Add Item'}
          </Text>
          <Text style={[styles.action, styles.hidden]}>Cancel</Text>
        </View>

        {step === 'form' ? (
          <ScrollView contentContainerStyle={styles.body}>
            <Icon name="plus.circle.fill" size={50} color={iOSColors.green} />
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Enter item details below</Text>

            <Field label="Item Name">
              <Input value={name} onChangeText={setName} placeholder="Enter item name" />
            </Field>
            <Field label="SKU / Barcode">
              <Input value={sku} onChangeText={setSku} placeholder="Enter SKU or barcode (optional)" autoCapitalize="characters" />
            </Field>
            <View style={styles.row}>
              <Field label="Quantity" style={styles.flex}>
                <Input value={quantity} onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ''))} placeholder="0" keyboardType="number-pad" />
              </Field>
              <Field label="Unit Price" style={styles.flex}>
                <Input value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))} placeholder="$0.00" keyboardType="decimal-pad" />
              </Field>
            </View>
            <Field label="Reorder Level">
              <Input value={reorderLevel} onChangeText={(t) => setReorderLevel(t.replace(/[^0-9]/g, ''))} placeholder="Minimum stock before alert" keyboardType="number-pad" />
            </Field>
            <Field label="Category">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
                {inventory.allCategories.map((cat) => {
                  const active = category === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[styles.pill, { backgroundColor: active ? iOSColors.blue : 'transparent', borderColor: iOSColors.blue }]}>
                      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : iOSColors.blue }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Field>

            <Pressable
              onPress={() => name.trim() && setStep('services')}
              disabled={!name.trim()}
              style={[styles.primaryBtn, { backgroundColor: name.trim() ? iOSColors.blue : withOpacity(iOSColors.blue, 0.4) }]}>
              <Text style={styles.primaryBtnText}>Next</Text>
              <Icon name="chevron.right" size={14} color="#FFFFFF" weight="semibold" />
            </Pressable>
          </ScrollView>
        ) : step === 'services' ? (
          <ServiceLinkContent draft={draft} onSaved={() => setStep('success')} />
        ) : (
          <View style={styles.success}>
            <Icon name="checkmark.circle.fill" size={60} color={iOSColors.green} />
            <Text style={[styles.successTitle, { color: theme.primaryText }]}>Item Added!</Text>
            <View style={[styles.summary, { borderColor: theme.divider }]}>
              {name ? <SummaryRow label="Name" value={name} /> : null}
              {sku ? <SummaryRow label="SKU" value={sku} /> : null}
              {quantity ? <SummaryRow label="Quantity" value={quantity} /> : null}
              {price ? <SummaryRow label="Price" value={`$${price}`} /> : null}
              <SummaryRow label="Category" value={category} />
            </View>
            <View style={styles.row}>
              <Pressable onPress={reset} style={[styles.outlineBtn, { borderColor: iOSColors.blue }]}>
                <Text style={[styles.outlineBtnText, { color: iOSColors.blue }]}>Add Another</Text>
              </Pressable>
              <Pressable onPress={close} style={[styles.primaryBtn, styles.flex, { backgroundColor: iOSColors.blue }]}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>
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
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.secondaryText}
      style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]}
    />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  action: { fontSize: 16, color: iOSColors.blue },
  hidden: { opacity: 0 },
  body: { padding: 16, gap: 16, alignItems: 'center' },
  subtitle: { fontSize: 14 },
  field: { alignSelf: 'stretch', gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  pills: { gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  pillText: { fontSize: 14, fontWeight: '500' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, alignSelf: 'stretch' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  success: { padding: 24, alignItems: 'center', gap: 16 },
  successTitle: { fontSize: 22, fontWeight: '700' },
  summary: { alignSelf: 'stretch', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '600' },
  outlineBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1 },
  outlineBtnText: { fontSize: 16, fontWeight: '500' },
});
