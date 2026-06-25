/**
 * ScheduleListView — agenda list grouping appointments by day (−7…+30 days),
 * with status badges and per-appointment cards. Port of ScheduleListView.swift.
 * The three per-card action buttons are decorative stubs (as a quick-action row).
 */

import type { SFSymbol } from 'expo-symbols';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { addDays } from '@/lib/schedule-layout';
import { appointmentTimeRange, type Appointment } from '@/models/appointment';
import { Brand, iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const headerFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const mdFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function headerLabel(d: Date): string {
  const today = new Date();
  const k = dayKey(d);
  if (k === dayKey(today)) return `Today, ${mdFmt.format(d)}`;
  if (k === dayKey(addDays(today, -1))) return `Yesterday, ${mdFmt.format(d)}`;
  if (k === dayKey(addDays(today, 1))) return `Tomorrow, ${mdFmt.format(d)}`;
  return headerFmt.format(d);
}

function status(a: Appointment): { text: string; color: string } {
  const now = Date.now();
  const start = new Date(a.startTime).getTime();
  const end = new Date(a.endTime).getTime();
  if (end < now) return { text: 'COMPLETED', color: iOSColors.green };
  if (start <= now && end >= now) return { text: 'IN PROGRESS', color: iOSColors.blue };
  return { text: 'UPCOMING', color: iOSColors.orange };
}

export function ScheduleListView({
  selectedDate,
  appointments,
  onAppointmentPress,
}: {
  selectedDate: Date;
  appointments: Appointment[];
  onAppointmentPress: (a: Appointment) => void;
}) {
  const theme = useAppTheme();

  const groups: { date: Date; items: Appointment[] }[] = [];
  for (let off = -7; off < 30; off++) {
    const date = addDays(selectedDate, off);
    const items = appointments
      .filter((a) => dayKey(new Date(a.startTime)) === dayKey(date))
      .sort((x, y) => new Date(x.startTime).getTime() - new Date(y.startTime).getTime());
    if (items.length) groups.push({ date, items });
  }

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Icon name="calendar.badge.clock" size={48} color={withOpacity(iOSColors.gray, 0.5)} />
        <Text style={[styles.emptyTitle, { color: theme.secondaryText }]}>No Appointments</Text>
        <Text style={[styles.emptySub, { color: withOpacity(iOSColors.gray, 0.7) }]}>
          Your upcoming appointments will appear here
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {groups.map((g) => (
        <View key={dayKey(g.date)} style={styles.group}>
          <Text style={[styles.groupHeader, { color: theme.primaryText }]}>{headerLabel(g.date)}</Text>
          {g.items.map((a) => (
            <Card key={a.id} appointment={a} onPress={() => onAppointmentPress(a)} />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Card({ appointment: a, onPress }: { appointment: Appointment; onPress: () => void }) {
  const theme = useAppTheme();
  const s = status(a);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: withOpacity(a.serviceColor, 0.08), borderColor: withOpacity(a.serviceColor, 0.15) }]}>
      <View style={[styles.cardBar, { backgroundColor: a.serviceColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={[styles.client, { color: theme.primaryText }]}>{a.clientName}</Text>
          <Text style={[styles.service, { color: theme.secondaryText }]}>{a.serviceName}</Text>
          {a.staffMemberName ? (
            <View style={styles.staffRow}>
              <Icon name="person.fill" size={10} color={Brand.accent} />
              <Text style={[styles.staff, { color: Brand.accent }]}>{a.staffMemberName}</Text>
            </View>
          ) : null}
          <Text style={[styles.badge, { backgroundColor: s.color }]}>{s.text}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.time, { color: theme.primaryText }]}>{appointmentTimeRange(a)}</Text>
          <Text style={[styles.total, { color: theme.secondaryText }]}>Total: ${a.price.toFixed(0)}</Text>
          <View style={styles.actions}>
            <ActionBtn icon="dollarsign" />
            <ActionBtn icon="doc.text.fill" />
            <ActionBtn icon="paperplane.fill" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ActionBtn({ icon }: { icon: SFSymbol }) {
  return (
    <View style={[styles.actionBtn, { backgroundColor: Brand.accent }]}>
      <Icon name={icon} size={12} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '500' },
  emptySub: { fontSize: 14 },
  list: { padding: 20, gap: 24 },
  group: { gap: 12 },
  groupHeader: { fontSize: 16, fontWeight: '600', paddingHorizontal: 4 },
  card: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardBar: { width: 4, marginVertical: 8, marginLeft: 0, borderRadius: 2 },
  cardContent: { flex: 1, flexDirection: 'row', padding: 14, gap: 12 },
  cardLeft: { flex: 1, gap: 6, alignItems: 'flex-start' },
  client: { fontSize: 17, fontWeight: '600' },
  service: { fontSize: 14 },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  staff: { fontSize: 12, fontWeight: '500' },
  badge: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  time: { fontSize: 14, fontWeight: '500' },
  total: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
