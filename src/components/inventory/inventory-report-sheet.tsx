/**
 * Inventory Report sheet — port of InventoryReportView.swift.
 * On-screen report: summary metrics, by-category table, needs-attention, and the
 * full item list. The native UIKit PDF renderer is replaced by a text/CSV export
 * via the RN share sheet.
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { itemTotalValue, statusColor, statusLabel, stockStatus, type InventoryItem } from '@/models/inventory';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const genFmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeStyle: 'short' });

export function InventoryReportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const inventory = useInventory();
  const items = inventory.items;
  const [generated] = useState(() => genFmt.format(new Date()));

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const alertItems = [...inventory.lowStockItems, ...inventory.outOfStockItems];

  const exportReport = async () => {
    const lines = [
      'Inventory Report',
      `Generated ${generated}`,
      '',
      `Total Unique Products,${items.length}`,
      `Total Units in Stock,${inventory.totalItemCount}`,
      `Total Inventory Value,${usd.format(inventory.totalValue)}`,
      `In Stock,${inventory.inStockItems.length}`,
      `Low Stock,${inventory.lowStockItems.length}`,
      `Out of Stock,${inventory.outOfStockItems.length}`,
      '',
      'Item,Qty,Value,Status',
      ...items.map((i) => `"${i.name}",${i.quantity},${usd.format(itemTotalValue(i))},${statusLabel(stockStatus(i))}`),
    ];
    try {
      await Share.share({ title: 'Inventory Report', message: lines.join('\n') });
    } catch {
      // cancelled
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.action}>Close</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Inventory Report</Text>
          <Text style={[styles.action, styles.hidden]}>Close</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {/* Report header */}
          <View style={styles.reportHead}>
            <Icon name="doc.text.fill" size={40} color={iOSColors.purple} />
            <Text style={[styles.reportTitle, { color: theme.primaryText }]}>Inventory Report</Text>
            <Text style={[styles.reportDate, { color: theme.secondaryText }]}>Generated {generated}</Text>
          </View>

          {/* Summary */}
          <SectionHeader title="Summary" icon="chart.bar.fill" color={iOSColors.blue} />
          <View style={[styles.panel, { borderColor: theme.divider }]}>
            <MetricRow label="Total Unique Products" value={`${items.length}`} color={iOSColors.blue} />
            <MetricRow label="Total Units in Stock" value={`${inventory.totalItemCount}`} color={iOSColors.blue} />
            <MetricRow label="Total Inventory Value" value={usd.format(inventory.totalValue)} color={iOSColors.green} />
            <MetricRow label="In Stock Items" value={`${inventory.inStockItems.length}`} color={iOSColors.green} />
            <MetricRow label="Low Stock Items" value={`${inventory.lowStockItems.length}`} color={iOSColors.orange} />
            <MetricRow label="Out of Stock Items" value={`${inventory.outOfStockItems.length}`} color={iOSColors.red} />
          </View>

          {/* By category */}
          <SectionHeader title="By Category" icon="tag.fill" color={iOSColors.purple} />
          <View style={[styles.panel, { borderColor: theme.divider }]}>
            <View style={[styles.tableHead, { backgroundColor: withOpacity(iOSColors.gray, 0.08) }]}>
              <Text style={[styles.thLeft, { color: theme.secondaryText }]}>Category</Text>
              <Text style={[styles.thNum, { color: theme.secondaryText }]}>Items</Text>
              <Text style={[styles.thNum, { color: theme.secondaryText }]}>Units</Text>
              <Text style={[styles.thValue, { color: theme.secondaryText }]}>Value</Text>
            </View>
            {categories.map((cat) => {
              const catItems = items.filter((i) => i.category === cat);
              const qty = catItems.reduce((s, i) => s + i.quantity, 0);
              const value = catItems.reduce((s, i) => s + itemTotalValue(i), 0);
              return (
                <View key={cat} style={styles.tableRow}>
                  <Text style={[styles.tdLeft, { color: theme.primaryText }]} numberOfLines={1}>{cat}</Text>
                  <Text style={[styles.tdNum, { color: theme.primaryText }]}>{catItems.length}</Text>
                  <Text style={[styles.tdNum, { color: theme.primaryText }]}>{qty}</Text>
                  <Text style={[styles.tdValue, { color: theme.primaryText }]}>{usd.format(value)}</Text>
                </View>
              );
            })}
            {categories.length === 0 && <Text style={[styles.emptyHint, { color: theme.secondaryText }]}>No items yet.</Text>}
          </View>

          {/* Needs attention */}
          <SectionHeader title="Needs Attention" icon="exclamationmark.triangle.fill" color={iOSColors.orange} />
          {alertItems.length === 0 ? (
            <View style={[styles.okBanner, { backgroundColor: withOpacity(iOSColors.green, 0.05) }]}>
              <Icon name="checkmark.circle.fill" size={18} color={iOSColors.green} />
              <Text style={[styles.okText, { color: theme.secondaryText }]}>All items are sufficiently stocked</Text>
            </View>
          ) : (
            <View style={styles.attention}>
              {alertItems.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </View>
          )}

          {/* Full list */}
          <SectionHeader title="All Items" icon="list.bullet.rectangle.fill" color={iOSColors.blue} />
          <View style={[styles.panel, { borderColor: theme.divider }]}>
            <View style={[styles.tableHead, { backgroundColor: withOpacity(iOSColors.gray, 0.08) }]}>
              <Text style={[styles.thLeft, { color: theme.secondaryText }]}>Item</Text>
              <Text style={[styles.thNum, { color: theme.secondaryText }]}>Qty</Text>
              <Text style={[styles.thValue, { color: theme.secondaryText }]}>Status</Text>
            </View>
            {items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tdLeft, { color: theme.primaryText }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.tdNum, { color: theme.primaryText }]}>{item.quantity}</Text>
                <Text style={[styles.tdValue, { color: statusColor(stockStatus(item)) }]}>{statusLabel(stockStatus(item))}</Text>
              </View>
            ))}
            {items.length === 0 && <Text style={[styles.emptyHint, { color: theme.secondaryText }]}>No items yet.</Text>}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.divider }]}>
          <Pressable onPress={exportReport} style={styles.exportWrap}>
            <View style={[styles.export, { backgroundColor: iOSColors.purple }]}>
              <Icon name="square.and.arrow.up" size={16} color="#FFFFFF" />
              <Text style={styles.exportText}>Export Report</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SectionHeader({ title, icon, color }: { title: string; icon: import('expo-symbols').SymbolViewProps['name']; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
    </View>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

function AttentionRow({ item }: { item: InventoryItem }) {
  const theme = useAppTheme();
  const color = statusColor(stockStatus(item));
  return (
    <View style={[styles.attentionRow, { backgroundColor: withOpacity(color, 0.05) }]}>
      <View style={[styles.attDot, { backgroundColor: color }]} />
      <Text style={[styles.attName, styles.flex, { color: theme.primaryText }]} numberOfLines={1}>{item.name}</Text>
      <View style={styles.attRight}>
        <Text style={[styles.attQty, { color }]}>Qty: {item.quantity}</Text>
        <Text style={[styles.attStatus, { color }]}>{statusLabel(stockStatus(item))}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  grabber: { alignSelf: 'center', width: 40, height: 6, borderRadius: 3, backgroundColor: 'rgba(150,150,150,0.5)', marginTop: 12, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  action: { fontSize: 16, color: iOSColors.blue },
  hidden: { opacity: 0 },
  body: { padding: 16, gap: 14 },
  reportHead: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  reportTitle: { fontSize: 22, fontWeight: '700' },
  reportDate: { fontSize: 13 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  panel: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  metricLabel: { fontSize: 14 },
  metricValue: { fontSize: 14, fontWeight: '700' },
  tableHead: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  thLeft: { flex: 1, fontSize: 12, fontWeight: '600' },
  thNum: { width: 50, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  thValue: { width: 80, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  tableRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10 },
  tdLeft: { flex: 1, fontSize: 13 },
  tdNum: { width: 50, textAlign: 'center', fontSize: 13 },
  tdValue: { width: 80, textAlign: 'right', fontSize: 13 },
  emptyHint: { fontSize: 13, padding: 14 },
  okBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12 },
  okText: { fontSize: 14 },
  attention: { gap: 8 },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  attDot: { width: 10, height: 10, borderRadius: 5 },
  attName: { fontSize: 14, fontWeight: '500' },
  attRight: { alignItems: 'flex-end' },
  attQty: { fontSize: 13, fontWeight: '600' },
  attStatus: { fontSize: 10, marginTop: 2 },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  exportWrap: {},
  export: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 12 },
  exportText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
