/**
 * Inventory dashboard — port of InventoryDashboardView.swift.
 * Overview metrics, a scan CTA, All/Low/Out-of-Stock tabs with search, a 2-column
 * item grid, quick actions, and recent activity. Tapping an item opens the detail
 * sheet; "+" opens the add sheet. The barcode scanner is native (AVFoundation) and
 * stubbed; Report / Reorder Alerts / Manual Re-order / full Activity arrive in 6b-ii.
 */

import { LinearGradient } from 'expo-linear-gradient';
import type { SFSymbol } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ActivityHistorySheet } from '@/components/inventory/activity-history-sheet';
import { AddItemSheet } from '@/components/inventory/add-item-sheet';
import { InventoryReportSheet } from '@/components/inventory/inventory-report-sheet';
import { ItemDetailSheet } from '@/components/inventory/item-detail-sheet';
import { ManualReorderSheet } from '@/components/inventory/manual-reorder-sheet';
import { ReorderAlertsSheet } from '@/components/inventory/reorder-alerts-sheet';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import {
  activityColor,
  activityIcon,
  statusColor,
  statusLabel,
  stockStatus,
  type InventoryItem,
} from '@/models/inventory';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Tab = 'All Items' | 'Low Stock' | 'Out of Stock';
const TABS: Tab[] = ['All Items', 'Low Stock', 'Out of Stock'];
const activityDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function Inventory() {
  const theme = useAppTheme();
  const router = useRouter();
  const inventory = useInventory();
  const [tab, setTab] = useState<Tab>('All Items');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const scanStub = () => Alert.alert('Scan Package Label', 'The barcode/label scanner needs the native build (camera). Coming with native modules.');

  const base =
    tab === 'Low Stock' ? inventory.lowStockItems : tab === 'Out of Stock' ? inventory.outOfStockItems : inventory.items;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? base.filter((i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q))
    : base;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: withOpacity(theme.cardBackground, 0.7) }]}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={iOSColors.blue} weight="semibold" />
            <Text style={[styles.backText, { color: iOSColors.blue }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Inventory</Text>
          <View style={styles.headerActions}>
            <Pressable onPress={scanStub} hitSlop={8}>
              <Icon name="barcode.viewfinder" size={22} color={iOSColors.blue} />
            </Pressable>
            <Pressable onPress={() => setShowAdd(true)} hitSlop={8}>
              <Icon name="plus.circle.fill" size={22} color={iOSColors.blue} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <Text style={[styles.sectionLink, { color: iOSColors.blue }]}>Overview</Text>

          {/* Metrics */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metrics}>
            <Metric title="Total Items" value={`${inventory.totalItemCount}`} subtitle="Across all categories" icon="shippingbox.fill" color={iOSColors.blue} />
            <Metric title="Total Value" value={`$${inventory.totalValue.toFixed(2)}`} subtitle="Current inventory worth" icon="dollarsign.circle.fill" color={iOSColors.green} />
            <Metric title="Low Stock" value={`${inventory.lowStockItems.length}`} subtitle="Items need reorder" icon="exclamationmark.triangle.fill" color={iOSColors.orange} />
            <Metric title="Out of Stock" value={`${inventory.outOfStockItems.length}`} subtitle="Immediate attention" icon="xmark.circle.fill" color={iOSColors.red} />
            <Metric title="Incoming" value={`${inventory.recentActivities.filter((a) => a.type === 'incoming').length}`} subtitle="Recent restocks" icon="arrow.down.circle.fill" color={iOSColors.purple} />
          </ScrollView>

          {/* Scan CTA */}
          <Pressable onPress={scanStub} style={styles.ctaWrap}>
            <LinearGradient colors={[iOSColors.blue, iOSColors.purple]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cta}>
              <Icon name="barcode.viewfinder" size={40} color="#FFFFFF" />
              <View style={styles.flex}>
                <Text style={styles.ctaTitle}>Scan Package Label</Text>
                <Text style={styles.ctaSub} numberOfLines={2}>Quickly log incoming stock by scanning barcodes or QR codes</Text>
              </View>
              <Icon name="chevron.right.circle.fill" size={24} color="rgba(255,255,255,0.8)" />
            </LinearGradient>
          </Pressable>

          {/* Tabs */}
          <View style={styles.tabs}>
            {TABS.map((t) => {
              const active = tab === t;
              return (
                <Pressable key={t} style={styles.tab} onPress={() => setTab(t)}>
                  <Text style={[styles.tabText, { color: active ? iOSColors.blue : iOSColors.gray, fontWeight: active ? '600' : '500' }]}>{t}</Text>
                  <View style={[styles.tabRule, { backgroundColor: active ? iOSColors.blue : 'transparent' }]} />
                </Pressable>
              );
            })}
          </View>

          {/* Search */}
          <View style={[styles.search, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search inventory..."
              placeholderTextColor={theme.secondaryText}
              style={[styles.searchInput, { color: theme.primaryText }]}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={16} color={theme.secondaryText} />
              </Pressable>
            )}
          </View>

          {/* Items */}
          {inventory.items.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="shippingbox" size={48} color={withOpacity(iOSColors.gray, 0.5)} />
              <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No inventory items yet</Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Start by adding your first item to begin tracking your inventory</Text>
              <Pressable onPress={() => setShowAdd(true)} style={[styles.addFirst, { backgroundColor: iOSColors.blue }]}>
                <Icon name="plus.circle.fill" size={16} color="#FFFFFF" />
                <Text style={styles.addFirstText}>Add First Item</Text>
              </Pressable>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="magnifyingglass" size={40} color={withOpacity(iOSColors.gray, 0.5)} />
              <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No items found</Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
              ))}
            </View>
          )}

          {/* Quick actions */}
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Quick Actions</Text>
          <ActionButton icon="barcode.viewfinder" title="Scan Package Label" subtitle="Log incoming stock" color={iOSColors.blue} onPress={scanStub} />
          <ActionButton icon="plus.circle.fill" title="Add Item Manually" subtitle="Enter stock details" color={iOSColors.green} onPress={() => setShowAdd(true)} />
          <ActionButton icon="doc.text.fill" title="Generate Report" subtitle="Export inventory data" color={iOSColors.purple} onPress={() => setShowReport(true)} />
          <ActionButton icon="bell.badge.fill" title="Reorder Alerts" subtitle="Manage notifications" color={iOSColors.red} onPress={() => setShowAlerts(true)} />
          <ActionButton icon="arrow.triangle.2.circlepath.circle.fill" title="Manual Re-order" subtitle="Log incoming stock by hand" color={iOSColors.orange} onPress={() => setShowReorder(true)} />

          {/* Recent activity */}
          <View style={styles.recentHead}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recent Activity</Text>
            <Pressable onPress={() => setShowActivity(true)}>
              <Text style={[styles.viewAll, { color: iOSColors.blue }]}>View All</Text>
            </Pressable>
          </View>
          {inventory.recentActivities.length === 0 ? (
            <View style={styles.activityEmpty}>
              <Icon name="calendar" size={28} color={withOpacity(iOSColors.gray, 0.5)} />
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>No activity yet</Text>
            </View>
          ) : (
            inventory.recentActivities.slice(0, 4).map((a) => (
              <View key={a.id} style={[styles.activityRow, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                <View style={[styles.activityIcon, { backgroundColor: withOpacity(activityColor(a.type), 0.2) }]}>
                  <Icon name={activityIcon(a.type)} size={24} color={activityColor(a.type)} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.activityAction, { color: theme.primaryText }]}>{a.action}</Text>
                  <Text style={[styles.activityItem, { color: theme.secondaryText }]}>{a.itemName}</Text>
                  <Text style={[styles.activityDate, { color: withOpacity(iOSColors.gray, 0.8) }]}>{activityDateFmt.format(new Date(a.date))}</Text>
                </View>
                <Text style={[styles.activityQty, { color: a.quantityChange < 0 ? iOSColors.red : iOSColors.green }]}>
                  {a.quantityChange < 0 ? '' : '+'}{a.quantityChange}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <AddItemSheet visible={showAdd} onClose={() => setShowAdd(false)} />
      <ItemDetailSheet item={detailItem} onClose={() => setDetailItem(null)} />
      <ReorderAlertsSheet visible={showAlerts} onClose={() => setShowAlerts(false)} />
      <ManualReorderSheet visible={showReorder} onClose={() => setShowReorder(false)} />
      <InventoryReportSheet visible={showReport} onClose={() => setShowReport(false)} />
      <ActivityHistorySheet visible={showActivity} onClose={() => setShowActivity(false)} />
    </DashboardGradient>
  );
}

function Metric({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle: string; icon: SFSymbol; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.cardBackground, borderColor: withOpacity(color, 0.2) }, lightShadow(theme)]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[styles.metricValue, { color: theme.primaryText }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.metricTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.metricSub, { color: theme.secondaryText }]} numberOfLines={1}>{subtitle}</Text>
    </View>
  );
}

function ItemCard({ item, onPress }: { item: InventoryItem; onPress: () => void }) {
  const theme = useAppTheme();
  const status = stockStatus(item);
  const color = statusColor(status);
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={onPress}>
      <View style={styles.cardTop}>
        <View style={[styles.catBadge, { backgroundColor: withOpacity(iOSColors.blue, 0.8) }]}>
          <Text style={styles.catBadgeText} numberOfLines={1}>{item.category}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.cardName, { color: theme.primaryText }]} numberOfLines={2}>{item.name}</Text>
      <Text style={[styles.cardSku, { color: theme.secondaryText }]} numberOfLines={1}>{item.sku}</Text>
      <View style={styles.flex} />
      <View style={styles.cardBottom}>
        <View>
          <Text style={[styles.cardQtyLabel, { color: theme.secondaryText }]}>Qty</Text>
          <Text style={[styles.cardQty, { color }]}>{item.quantity}</Text>
        </View>
        <Text style={[styles.cardStatus, { color }]}>{statusLabel(status)}</Text>
      </View>
    </Pressable>
  );
}

function ActionButton({ icon, title, subtitle, color, onPress }: { icon: SFSymbol; title: string; subtitle: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable style={[styles.action, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={20} color="#FFFFFF" />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.actionTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.actionSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16, minWidth: 70, justifyContent: 'flex-end' },
  body: { paddingBottom: 40, gap: 20, paddingTop: 8 },
  sectionLink: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16 },
  metrics: { gap: 12, paddingHorizontal: 16 },
  metric: { width: 150, height: 140, padding: 16, borderRadius: 12, borderWidth: 1, gap: 8, justifyContent: 'flex-start' },
  metricValue: { fontSize: 26, fontWeight: '700', marginTop: 4 },
  metricTitle: { fontSize: 14, fontWeight: '500' },
  metricSub: { fontSize: 11 },
  ctaWrap: { paddingHorizontal: 16 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderRadius: 16 },
  ctaTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  ctaSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16 },
  tab: { flex: 1, alignItems: 'center', gap: 8 },
  tabText: { fontSize: 14 },
  tabRule: { height: 2, alignSelf: 'stretch', borderRadius: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, marginHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, gap: 12 },
  card: { width: '47%', height: 140, padding: 12, borderRadius: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, maxWidth: '75%' },
  catBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '500' },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardName: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  cardSku: { fontSize: 11, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  cardQtyLabel: { fontSize: 10 },
  cardQty: { fontSize: 16, fontWeight: '700' },
  cardStatus: { fontSize: 10, fontWeight: '500' },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  addFirst: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 4 },
  addFirstText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, marginHorizontal: 16 },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: 16, fontWeight: '500' },
  actionSub: { fontSize: 12, marginTop: 2 },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  viewAll: { fontSize: 14, fontWeight: '500' },
  activityEmpty: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12, marginHorizontal: 16 },
  activityIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  activityAction: { fontSize: 16, fontWeight: '600' },
  activityItem: { fontSize: 14, marginTop: 2 },
  activityDate: { fontSize: 12, marginTop: 2 },
  activityQty: { fontSize: 18, fontWeight: '700' },
});
