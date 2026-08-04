/**
 * Search Appointments — port of SearchAppointmentsView.swift.
 * Text search + filter/date-range pills + result cards. Reached from the menu.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAppointments } from '@/context/appointments-store';
import { withOpacity } from '@/lib/color';
import { addDays, isToday } from '@/lib/schedule-layout';
import { appointmentTimeRange, type Appointment } from '@/models/appointment';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Filter = 'All' | 'Upcoming' | 'Past' | 'Today';
type Range = 'All Time' | 'This Week' | 'This Month';
const FILTERS: Filter[] = ['All', 'Upcoming', 'Past', 'Today'];
const RANGES: Range[] = ['All Time', 'This Week', 'This Month'];

const dowFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const monFmt = new Intl.DateTimeFormat('en-US', { month: 'short' });

export default function SearchScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { appointments } = useAppointments();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [range, setRange] = useState<Range>('All Time');

  const now = Date.now();
  let results = appointments;
  if (query) {
    const q = query.toLowerCase();
    results = results.filter(
      (a) => a.clientName.toLowerCase().includes(q) || a.serviceName.toLowerCase().includes(q),
    );
  }
  results = results.filter((a) => {
    const t = new Date(a.startTime).getTime();
    if (filter === 'Upcoming' && t <= now) return false;
    if (filter === 'Past' && t >= now) return false;
    if (filter === 'Today' && !isToday(new Date(a.startTime))) return false;
    if (range === 'This Week') {
      return t >= addDays(new Date(), -7).getTime() && t <= addDays(new Date(), 7).getTime();
    }
    if (range === 'This Month') {
      return t >= addDays(new Date(), -31).getTime() && t <= addDays(new Date(), 31).getTime();
    }
    return true;
  });
  results = [...results].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Search" />

        <View style={styles.controls}>
          <View style={[styles.searchBar, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Icon name="magnifyingglass" size={18} color={theme.secondaryText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search clients, services..."
              placeholderTextColor={theme.tertiaryText}
              autoFocus
              style={[styles.searchInput, { color: theme.primaryText }]}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Icon name="xmark.circle.fill" size={18} color={theme.secondaryText} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {FILTERS.map((f) => (
              <Pill key={f} title={f} active={filter === f} color={iOSColors.blue} onPress={() => setFilter(f)} />
            ))}
            <View style={[styles.pillDivider, { backgroundColor: theme.divider }]} />
            {RANGES.map((r) => (
              <Pill key={r} title={r} active={range === r} color={iOSColors.purple} onPress={() => setRange(r)} />
            ))}
          </ScrollView>
        </View>

        {results.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyCircle, { backgroundColor: withOpacity(iOSColors.gray, 0.1) }]}>
              <Icon name={query ? 'magnifyingglass' : 'calendar.badge.clock'} size={40} color={withOpacity(iOSColors.gray, 0.4)} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>
              {query ? 'No Results Found' : 'Search Appointments'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>
              {query ? 'Try a different search term or filter' : 'Search by client name or service'}
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.results}>
            <Text style={[styles.count, { color: theme.secondaryText }]}>
              {results.length} appointment{results.length === 1 ? '' : 's'} found
            </Text>
            {results.map((a) => (
              <ResultCard key={a.id} appointment={a} onPress={() => router.push(`/appointments/${a.id}`)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Pill({ title, active, color, onPress }: { title: string; active: boolean; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, { borderColor: color, backgroundColor: active ? color : theme.cardBackground }]}>
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : color }]}>{title}</Text>
    </Pressable>
  );
}

function ResultCard({ appointment: a, onPress }: { appointment: Appointment; onPress: () => void }) {
  const theme = useAppTheme();
  const start = new Date(a.startTime);
  const today = isToday(start);
  const upcoming = start.getTime() > Date.now();
  const badge = today
    ? { text: 'Today', color: iOSColors.blue }
    : upcoming
      ? { text: 'Upcoming', color: iOSColors.green }
      : { text: 'Past', color: iOSColors.gray };

  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.colorBar, { backgroundColor: a.serviceColor }]} />
      <View style={styles.dateCol}>
        <Text style={[styles.dow, { color: theme.secondaryText }]}>{dowFmt.format(start).toUpperCase()}</Text>
        <Text style={[styles.dayNum, { color: today ? iOSColors.blue : theme.primaryText }]}>{start.getDate()}</Text>
        <Text style={[styles.mon, { color: theme.secondaryText }]}>{monFmt.format(start).toUpperCase()}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.detailHead}>
          <Text style={[styles.client, { color: theme.primaryText }]}>{a.clientName}</Text>
          <Text style={[styles.badge, { color: badge.color, backgroundColor: withOpacity(badge.color, 0.15) }]}>{badge.text}</Text>
        </View>
        <View style={styles.serviceRow}>
          <View style={[styles.serviceDot, { backgroundColor: a.serviceColor }]} />
          <Text style={[styles.service, { color: theme.secondaryText }]}>{a.serviceName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Icon name="clock" size={12} color={theme.secondaryText} />
          <Text style={[styles.meta, { color: theme.secondaryText }]}>{appointmentTimeRange(a)}</Text>
          <Icon name="dollarsign.circle" size={12} color={iOSColors.green} />
          <Text style={[styles.metaGreen]}>${a.price.toFixed(0)}</Text>
        </View>
      </View>
      <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  controls: { padding: 16, gap: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4, textAlignVertical: 'center' },
  pills: { gap: 10, alignItems: 'center', paddingRight: 8 },
  pillDivider: { width: 1, height: 24 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  pillText: { fontSize: 14, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  results: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  count: { fontSize: 14, fontWeight: '500' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  colorBar: { width: 6, height: 50, borderRadius: 3 },
  dateCol: { width: 44, alignItems: 'center', gap: 2 },
  dow: { fontSize: 11, fontWeight: '500' },
  dayNum: { fontSize: 22, fontWeight: '700' },
  mon: { fontSize: 11, fontWeight: '500' },
  details: { flex: 1, gap: 6 },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  client: { fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceDot: { width: 8, height: 8, borderRadius: 4 },
  service: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontSize: 13 },
  metaGreen: { fontSize: 13, fontWeight: '500', color: iOSColors.green },
});
