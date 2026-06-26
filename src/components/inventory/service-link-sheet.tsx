/**
 * Service & Re-order link content — port of InventoryServiceLinkSheet.swift.
 * The second step of the add-item flow: link services with per-service refill
 * rates, set auto-calc / re-order quantity / auto-reorder, and a vendor re-order
 * link. Builds the final InventoryItem and saves it. Rendered embedded inside the
 * Add Item sheet (the parent owns the header). Vendor records arrive in Phase 6d,
 * so the vendor picker shows an empty-state; the re-order URL/SKU still save.
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { useServices } from '@/context/services-store';
import { uuid } from '@/lib/id';
import { withOpacity } from '@/lib/color';
import type { ServiceUsageRate } from '@/models/inventory';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface InventoryItemDraft {
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  category: string;
}

function normalizeURL(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

export function ServiceLinkContent({
  draft,
  onSaved,
}: {
  draft: InventoryItemDraft;
  onSaved: () => void;
}) {
  const theme = useAppTheme();
  const inventory = useInventory();
  const { services } = useServices();

  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateText, setRateText] = useState<Record<string, string>>({});
  const [autoCalc, setAutoCalc] = useState(false);
  const [reorderQty, setReorderQty] = useState('');
  const [autoReorder, setAutoReorder] = useState(false);
  const [reorderURL, setReorderURL] = useState('');
  const [vendorSku, setVendorSku] = useState('');

  const linkedCount = Object.keys(rates).length;
  const multiple = linkedCount >= 2;
  const urlInvalid = reorderURL.trim().length > 0 && normalizeURL(reorderURL) === null;

  const toggleService = (id: string) =>
    setRates((prev) => {
      const next = { ...prev };
      if (next[id] == null) {
        next[id] = 1;
        setRateText((t) => ({ ...t, [id]: '1' }));
      } else {
        delete next[id];
        setRateText((t) => {
          const c = { ...t };
          delete c[id];
          return c;
        });
      }
      if (Object.keys(next).length < 2) setAutoCalc(false);
      return next;
    });

  const setRate = (id: string, text: string) => {
    setRateText((t) => ({ ...t, [id]: text }));
    const n = parseInt(text, 10);
    if (n > 0) setRates((prev) => ({ ...prev, [id]: n }));
  };

  const save = () => {
    const usageRates: ServiceUsageRate[] = Object.entries(rates)
      .filter(([, uses]) => uses > 0)
      .map(([serviceId, uses]) => ({ serviceId, usesBeforeRefill: uses, currentUsageCount: 0 }));
    const qty = parseInt(reorderQty, 10);
    inventory.addItem({
      name: draft.name,
      sku: draft.sku || `SKU-${uuid().slice(0, 6)}`,
      quantity: draft.quantity,
      reorderLevel: draft.reorderLevel,
      unitPrice: draft.unitPrice,
      category: draft.category,
      serviceUsageRates: usageRates,
      autoCalculateReorder: autoCalc && usageRates.length >= 2,
      reorderQuantity: qty > 0 ? qty : undefined,
      autoReorder,
      reorderURL: normalizeURL(reorderURL) ?? undefined,
      vendorSku: vendorSku.trim() || undefined,
    });
    onSaved();
  };

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.center}>
        <Icon name="link.circle.fill" size={44} color={iOSColors.purple} />
      </View>
      <Text style={[styles.intro, { color: theme.secondaryText }]}>Link this product to services and set re-order rules.</Text>

      {/* Services */}
      <Text style={[styles.label, { color: theme.secondaryText }]}>What services use this product?</Text>
      <Text style={[styles.hint, { color: theme.secondaryText }]}>Tap a service to link it, then set how many uses before it depletes the product.</Text>
      {services.length === 0 ? (
        <View style={[styles.noteBox, { backgroundColor: theme.divider }]}>
          <Text style={[styles.noteText, { color: theme.secondaryText }]}>No services yet. You can link services later from the item's detail page.</Text>
        </View>
      ) : (
        services.map((service) => {
          const linked = rates[service.id] != null;
          return (
            <View key={service.id} style={[styles.serviceRow, { backgroundColor: linked ? withOpacity(iOSColors.blue, 0.08) : theme.divider, borderColor: linked ? iOSColors.blue : 'transparent' }]}>
              <Pressable style={styles.serviceHead} onPress={() => toggleService(service.id)}>
                <View style={[styles.serviceDot, { backgroundColor: service.colorHex }]} />
                <Text style={[styles.serviceName, styles.flex, { color: theme.primaryText }]}>{service.name}</Text>
                <Icon name={linked ? 'checkmark.circle.fill' : 'circle'} size={20} color={linked ? iOSColors.blue : withOpacity(iOSColors.gray, 0.5)} />
              </Pressable>
              {linked && (
                <View style={styles.refillRow}>
                  <Text style={[styles.refillText, { color: theme.secondaryText }]}>Refill after</Text>
                  <TextInput
                    value={rateText[service.id] ?? ''}
                    onChangeText={(t) => setRate(service.id, t.replace(/[^0-9]/g, ''))}
                    placeholder="uses"
                    placeholderTextColor={theme.secondaryText}
                    keyboardType="number-pad"
                    style={[styles.refillInput, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: withOpacity(iOSColors.gray, 0.3) }]}
                  />
                  <Text style={[styles.refillText, styles.flex, { color: theme.secondaryText }]} numberOfLines={1}>uses of {service.name}.</Text>
                </View>
              )}
            </View>
          );
        })
      )}

      {/* Auto-calculate */}
      <View style={[styles.toggleCard, { backgroundColor: theme.divider }]}>
        <Icon name="function" size={22} color={iOSColors.purple} />
        <View style={styles.flex}>
          <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>Auto-calculate re-order?</Text>
          <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>
            {multiple ? "Blend each service's refill rate and trigger the re-order when combined usage hits the limit." : 'Available when two or more services share this product.'}
          </Text>
        </View>
        <Switch value={autoCalc} onValueChange={setAutoCalc} disabled={!multiple} />
      </View>

      {/* Re-order quantity */}
      <Text style={[styles.label, { color: theme.secondaryText }]}>Re-order quantity</Text>
      <Text style={[styles.hint, { color: theme.secondaryText }]}>How many units should the app order when a re-order fires?</Text>
      <TextInput
        value={reorderQty}
        onChangeText={(t) => setReorderQty(t.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 10"
        placeholderTextColor={theme.secondaryText}
        keyboardType="number-pad"
        style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]}
      />

      {/* Auto re-order */}
      <View style={[styles.toggleCard, { backgroundColor: theme.divider }]}>
        <Icon name="arrow.triangle.2.circlepath.circle.fill" size={22} color={iOSColors.orange} />
        <View style={styles.flex}>
          <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>Auto re-order?</Text>
          <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>Place the order automatically when the threshold is hit. Off = you get a notification and place it manually.</Text>
        </View>
        <Switch value={autoReorder} onValueChange={setAutoReorder} />
      </View>

      {/* Vendor */}
      <Text style={[styles.label, { color: theme.secondaryText }]}>Where do you re-order from?</Text>
      <Text style={[styles.hint, { color: theme.secondaryText }]}>Paste the direct product page URL. The app opens that URL so you can re-order in one tap.</Text>
      <View style={[styles.noteBox, { backgroundColor: theme.divider }]}>
        <Text style={[styles.noteText, { color: theme.secondaryText }]}>No vendors yet. Add one in the Vendors section first, then link it here. (Vendor marketplace arrives in Phase 6d.)</Text>
      </View>
      <Text style={[styles.subLabel, { color: theme.secondaryText }]}>Re-order link (optional)</Text>
      <TextInput
        value={reorderURL}
        onChangeText={setReorderURL}
        placeholder="https://vendor.com/product/..."
        placeholderTextColor={theme.secondaryText}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]}
      />
      {urlInvalid && <Text style={[styles.warn, { color: iOSColors.orange }]}>That doesn't look like a full web address. Include http:// or https://.</Text>}
      <Text style={[styles.subLabel, { color: theme.secondaryText }]}>Vendor SKU (optional)</Text>
      <TextInput
        value={vendorSku}
        onChangeText={setVendorSku}
        placeholder="How the vendor lists this item"
        placeholderTextColor={theme.secondaryText}
        style={[styles.input, { backgroundColor: theme.divider, color: theme.primaryText }]}
      />

      <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: iOSColors.blue }]}>
        <Text style={styles.saveText}>Add to Inventory</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  body: { padding: 16, gap: 12 },
  intro: { fontSize: 14, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '500', marginTop: 6 },
  subLabel: { fontSize: 13, fontWeight: '500', marginTop: 4 },
  hint: { fontSize: 12 },
  noteBox: { padding: 14, borderRadius: 10 },
  noteText: { fontSize: 13 },
  serviceRow: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  serviceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  serviceDot: { width: 12, height: 12, borderRadius: 6 },
  serviceName: { fontSize: 15, fontWeight: '500' },
  refillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  refillText: { fontSize: 13 },
  refillInput: { width: 60, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, fontSize: 14 },
  toggleCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 10 },
  toggleTitle: { fontSize: 15, fontWeight: '600' },
  toggleSub: { fontSize: 12, marginTop: 4 },
  input: { padding: 14, borderRadius: 10, fontSize: 16 },
  warn: { fontSize: 12 },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
