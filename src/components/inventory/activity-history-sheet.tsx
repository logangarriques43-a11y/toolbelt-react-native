/**
 * Activity History sheet — port of ActivityHistoryView.swift.
 * Summary pills, type filters, and the full activity log grouped by Today /
 * Yesterday / This Week / Earlier.
 */

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useInventory } from '@/context/inventory-store';
import { withOpacity } from '@/lib/color';
import { activityColor, activityIcon, type ActivityKind, type InventoryActivity } from '@/models/inventory';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Filter = 'All' | 'Incoming' | 'Outgoing' | 'Alerts' | 'Appointments';
const FILTERS: Filter[] = ['All', 'Incoming', 'Outgoing', 'Alerts', 'Appointments'];
const FILTER_KIND: Record<Exclude<Filter, 'All'>, ActivityKind> = {
  Incoming: 'incoming',
  Outgoing: 'outgoing',
  Alerts: 'alert',
  Appointments: 'appointmentUsage',
};
const GROUPS = ['Today', 'Yesterday', 'This Week', 'Earlier'];
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const weekFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const earlierFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

function daysAgo(iso: string): number {
  const start = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  return Math.round((start(new Date()) - start(new Date(iso))) / 86_400_000);
}

function groupOf(iso: string): string {
  const d = daysAgo(iso);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d <= 6) return 'This Week';
  return 'Earlier';
}

function timeOf(iso: string): string {
  const d = daysAgo(iso);
  const date = new Date(iso);
  if (d <= 1) return timeFmt.format(date);
  if (d <= 6) return weekFmt.format(date);
  return earlierFmt.format(date);
}

export function ActivityHistorySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const { activities } = useInventory();
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = filter === 'All' ? activities : activities.filter((a) => a.type === FILTER_KIND[filter as Exclude<Filter, 'All'>]);
  const groups = GROUPS.map((g) => ({ group: g, items: filtered.filter((a) => groupOf(a.date) === g) })).filter((g) => g.items.length > 0);

  const count = (kind: ActivityKind) => activities.filter((a) => a.type === kind).length;
  const filterColor = (f: Filter): string =>
    f === 'Incoming' ? iOSColors.green : f === 'Outgoing' ? iOSColors.blue : f === 'Alerts' ? iOSColors.orange : f === 'Appointments' ? iOSColors.purple : iOSColors.gray;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.cardBackground }]}>
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.action}>Close</Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Activity History</Text>
          <Text style={[styles.action, styles.hidden]}>Close</Text>
        </View>

        {/* Summary */}
        <View style={[styles.summary, { backgroundColor: withOpacity(iOSColors.gray, 0.05) }]}>
          <SummaryPill value={count('incoming')} label="Incoming" color={iOSColors.green} />
          <View style={[styles.summaryDiv, { backgroundColor: theme.divider }]} />
          <SummaryPill value={count('outgoing')} label="Outgoing" color={iOSColors.blue} />
          <View style={[styles.summaryDiv, { backgroundColor: theme.divider }]} />
          <SummaryPill value={count('alert')} label="Alerts" color={iOSColors.orange} />
          <View style={[styles.summaryDiv, { backgroundColor: theme.divider }]} />
          <SummaryPill value={activities.length} label="Total" color={iOSColors.gray} />
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f;
            const c = filterColor(f);
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, { backgroundColor: active ? c : withOpacity(iOSColors.gray, 0.08) }]}>
                <View style={[styles.filterDot, { backgroundColor: active ? '#FFFFFF' : c }]} />
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.primaryText }]}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.body}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="clock.arrow.circlepath" size={40} color={withOpacity(iOSColors.gray, 0.5)} />
              <Text style={[styles.emptyTitle, { color: theme.secondaryText }]}>No activity found</Text>
              <Text style={[styles.emptySub, { color: withOpacity(iOSColors.gray, 0.7) }]}>There are no entries matching this filter.</Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.group} style={styles.group}>
                <View style={styles.groupHead}>
                  <Text style={[styles.groupTitle, { color: theme.primaryText }]}>{g.group}</Text>
                  <Text style={[styles.groupCount, { color: theme.secondaryText }]}>({g.items.length})</Text>
                </View>
                {g.items.map((a) => (
                  <Row key={a.id} activity={a} />
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SummaryPill({ value, label, color }: { value: number; label: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.pill}>
      <Text style={[styles.pillValue, { color }]}>{value}</Text>
      <Text style={[styles.pillLabel, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

function Row({ activity }: { activity: InventoryActivity }) {
  const theme = useAppTheme();
  const color = activityColor(activity.type);
  const sign = activity.type === 'outgoing' || activity.type === 'appointmentUsage' ? '-' : '+';
  const qtyColor = activity.type === 'incoming' ? iOSColors.green : activity.type === 'alert' ? iOSColors.orange : iOSColors.red;
  return (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.rowIcon, { backgroundColor: withOpacity(color, 0.2) }]}>
        <Icon name={activityIcon(activity.type)} size={20} color={color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowAction, { color: theme.primaryText }]}>{activity.action}</Text>
        <Text style={[styles.rowItem, { color: theme.secondaryText }]}>{activity.itemName}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowQty, { color: qtyColor }]}>{sign}{Math.abs(activity.quantityChange)}</Text>
        <Text style={[styles.rowDate, { color: theme.secondaryText }]}>{timeOf(activity.date)}</Text>
      </View>
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
  summary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, marginHorizontal: 16, borderRadius: 12 },
  summaryDiv: { width: 1, height: 30 },
  pill: { flex: 1, alignItems: 'center', gap: 4 },
  pillValue: { fontSize: 18, fontWeight: '700' },
  pillLabel: { fontSize: 11 },
  filters: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  filterDot: { width: 8, height: 8, borderRadius: 4 },
  filterText: { fontSize: 13, fontWeight: '500' },
  body: { padding: 16, gap: 20 },
  group: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  groupTitle: { fontSize: 15, fontWeight: '600' },
  groupCount: { fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12 },
  rowIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  rowAction: { fontSize: 15, fontWeight: '600' },
  rowItem: { fontSize: 13, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowQty: { fontSize: 16, fontWeight: '700' },
  rowDate: { fontSize: 11, marginTop: 2 },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '500' },
  emptySub: { fontSize: 13 },
});
