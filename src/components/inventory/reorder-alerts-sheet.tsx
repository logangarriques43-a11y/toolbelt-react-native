/**
 * Reorder Alerts sheet — port of ReorderAlertsView.swift.
 * A summary banner, local notification toggles, and Out-of-Stock / Low-Stock
 * sections (or an all-clear state). The per-row restock button tops the item up
 * by its reorder quantity (Swift left it a placeholder).
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { type InventoryItem } from '@/models/inventory';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function ReorderAlertsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const inventory = useInventory();
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [outOfStockAlerts, setOutOfStockAlerts] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  const out = inventory.outOfStockItems;
  const low = inventory.lowStockItems;
  const total = out.length + low.length;

  const restock = (item: InventoryItem) =>
    inventory.addStock(item.id, item.reorderQuantity ?? Math.max(item.reorderLevel, 1));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.action}>Close</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Reorder Alerts</Text>
          <Text style={[styles.action, styles.hidden]}>Close</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Banner */}
          <View style={[styles.banner, { backgroundColor: withOpacity(total > 0 ? iOSColors.red : iOSColors.green, 0.05), borderColor: withOpacity(total > 0 ? iOSColors.red : iOSColors.green, 0.15) }]}>
            <View style={[styles.bannerIcon, { backgroundColor: withOpacity(total > 0 ? iOSColors.red : iOSColors.green, 0.15) }]}>
              <Icon name={total > 0 ? 'bell.badge.fill' : 'bell.fill'} size={26} color={total > 0 ? iOSColors.red : iOSColors.green} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.bannerTitle, { color: theme.primaryText }]}>
                {total > 0 ? `${total} Item${total === 1 ? '' : 's'} Need Attention` : 'All Items Stocked'}
              </Text>
              <Text style={[styles.bannerSub, { color: theme.secondaryText }]}>
                {total > 0 ? `${out.length} out of stock · ${low.length} low stock` : 'No reorder alerts at this time'}
              </Text>
            </View>
          </View>

          {/* Notification settings */}
          <View style={styles.settingsHead}>
            <Icon name="gearshape.fill" size={14} color={theme.secondaryText} />
            <Text style={[styles.settingsTitle, { color: theme.primaryText }]}>Notification Settings</Text>
          </View>
          <View style={[styles.settingsCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <ToggleRow icon="bell.fill" iconColor={iOSColors.blue} title="Enable Alerts" subtitle="Get notified about stock levels" value={alertsEnabled} onChange={setAlertsEnabled} />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <ToggleRow icon="xmark.circle.fill" iconColor={iOSColors.red} title="Out of Stock" subtitle="Alert when quantity reaches 0" value={outOfStockAlerts} onChange={setOutOfStockAlerts} disabled={!alertsEnabled} />
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <ToggleRow icon="exclamationmark.triangle.fill" iconColor={iOSColors.orange} title="Low Stock" subtitle="Alert at or below reorder level" value={lowStockAlerts} onChange={setLowStockAlerts} disabled={!alertsEnabled} />
          </View>

          {out.length > 0 && <AlertSection title="Out of Stock" icon="xmark.circle.fill" color={iOSColors.red} items={out} onRestock={restock} />}
          {low.length > 0 && <AlertSection title="Low Stock" icon="exclamationmark.triangle.fill" color={iOSColors.orange} items={low} onRestock={restock} />}

          {total === 0 && (
            <View style={[styles.allClear, { backgroundColor: withOpacity(iOSColors.green, 0.05) }]}>
              <Icon name="checkmark.seal.fill" size={50} color={iOSColors.green} />
              <Text style={[styles.allClearTitle, { color: theme.primaryText }]}>All Stocked Up!</Text>
              <Text style={[styles.allClearSub, { color: theme.secondaryText }]}>All inventory items are above their reorder levels. No action needed right now.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onChange,
  disabled,
}: {
  icon: import('expo-symbols').SymbolViewProps['name'];
  iconColor: string;
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.toggleRow, disabled && styles.dim]}>
      <Icon name={icon} size={16} color={iconColor} />
      <View style={styles.flex}>
        <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

function AlertSection({
  title,
  icon,
  color,
  items,
  onRestock,
}: {
  title: string;
  icon: import('expo-symbols').SymbolViewProps['name'];
  color: string;
  items: InventoryItem[];
  onRestock: (item: InventoryItem) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Icon name={icon} size={14} color={color} />
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.sectionCount, { color: theme.secondaryText }]}>({items.length})</Text>
      </View>
      {items.map((item) => (
        <View key={item.id} style={[styles.alertRow, { backgroundColor: withOpacity(color, 0.04), borderColor: withOpacity(color, 0.12) }]}>
          <View style={[styles.alertDot, { backgroundColor: color }]} />
          <View style={styles.flex}>
            <Text style={[styles.alertName, { color: theme.primaryText }]}>{item.name}</Text>
            <Text style={[styles.alertSku, { color: theme.secondaryText }]}>{item.sku}</Text>
          </View>
          <View style={styles.alertStock}>
            <Text style={[styles.alertQty, { color }]}>Qty: {item.quantity}</Text>
            <Text style={[styles.alertReorder, { color: theme.secondaryText }]}>Reorder at {item.reorderLevel}</Text>
          </View>
          <Pressable onPress={() => onRestock(item)} hitSlop={6}>
            <Icon name="arrow.clockwise.circle.fill" size={28} color={iOSColors.blue} />
          </Pressable>
        </View>
      ))}
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
  body: { padding: 16, gap: 20 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 17, fontWeight: '700' },
  bannerSub: { fontSize: 13, marginTop: 4 },
  settingsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsTitle: { fontSize: 14, fontWeight: '600' },
  settingsCard: { borderRadius: 12, marginTop: -8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  dim: { opacity: 0.5 },
  toggleTitle: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 40 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionCount: { fontSize: 14, fontWeight: '500' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertName: { fontSize: 15, fontWeight: '500' },
  alertSku: { fontSize: 12, marginTop: 2 },
  alertStock: { alignItems: 'flex-end' },
  alertQty: { fontSize: 15, fontWeight: '700' },
  alertReorder: { fontSize: 11, marginTop: 2 },
  allClear: { alignItems: 'center', gap: 12, paddingVertical: 30, paddingHorizontal: 16, borderRadius: 14 },
  allClearTitle: { fontSize: 18, fontWeight: '700' },
  allClearSub: { fontSize: 14, textAlign: 'center' },
});
