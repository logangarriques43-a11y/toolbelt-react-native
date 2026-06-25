/**
 * Analytics — port of AnalyticsView.swift.
 * Period pills + metric-card sections. The Swift screen showed all zeros; here
 * the metrics we have local data for (clients, appointments, revenue) are
 * computed for real. SMS/invoice metrics remain 0 until those phases land.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { withOpacity } from '@/lib/color';
import { compactMoney } from '@/lib/compact-money';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PERIODS = ['This Week', 'This Month', 'This Quarter', 'This Year'];

export default function Analytics() {
  const theme = useAppTheme();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const [period, setPeriod] = useState('This Month');

  const now = Date.now();
  const completed = appointments.filter((a) => new Date(a.endTime).getTime() < now);
  const revenue = completed.reduce((sum, a) => sum + a.price, 0);
  const uniqueClients = new Set(appointments.map((a) => a.clientId)).size;
  const avgPerClient = uniqueClients ? revenue / uniqueClients : 0;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Analytics" />
        <ScrollView contentContainerStyle={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
            {PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.period, { backgroundColor: period === p ? iOSColors.blue : withOpacity(iOSColors.blue, 0.08) }]}>
                <Text style={[styles.periodText, { color: period === p ? '#FFFFFF' : iOSColors.blue }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionTitle title="Revenue" />
          <Grid>
            <Metric title="Total Revenue" value={compactMoney(revenue)} icon="dollarsign.circle.fill" color={iOSColors.green} />
            <Metric title="Avg per Client" value={compactMoney(avgPerClient)} icon="person.fill" color={iOSColors.blue} />
          </Grid>
          <Grid>
            <Metric title="Invoices Sent" value="0" icon="doc.text.fill" color={iOSColors.purple} />
            <Metric title="Pending" value="$0" icon="clock.fill" color={iOSColors.orange} />
          </Grid>

          <SectionTitle title="Appointments" />
          <Grid>
            <Metric title="Total Booked" value={String(appointments.length)} icon="calendar.badge.plus" color={iOSColors.blue} />
            <Metric title="Completed" value={String(completed.length)} icon="checkmark.circle.fill" color={iOSColors.green} />
          </Grid>
          <Grid>
            <Metric title="Cancelled" value="0" icon="xmark.circle.fill" color={iOSColors.red} />
            <Metric title="No-Shows" value="0" icon="person.fill.xmark" color={iOSColors.orange} />
          </Grid>

          <SectionTitle title="AI SMS" />
          <Grid>
            <Metric title="Messages Sent" value="0" icon="arrow.up.message.fill" color={iOSColors.teal} />
            <Metric title="Messages Received" value="0" icon="arrow.down.message.fill" color={iOSColors.blue} />
          </Grid>
          <Grid>
            <Metric title="Conversations" value="0" icon="bubble.left.and.text.bubble.right.fill" color={iOSColors.purple} />
            <Metric title="AI Booked" value="0" icon="sparkles" color={iOSColors.orange} />
          </Grid>

          <SectionTitle title="Clients" />
          <Grid>
            <Metric title="Total Clients" value={String(clients.length)} icon="person.2.fill" color={iOSColors.blue} />
            <Metric title="New This Month" value="0" icon="person.badge.plus" color={iOSColors.green} />
          </Grid>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

function Metric({ title, value, icon, color }: { title: string; value: string; icon: SFSymbol; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.metricIcon, { backgroundColor: theme.iconBackground(color) }]}>
        <Icon name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: theme.primaryText }]}>{value}</Text>
      <Text style={[styles.metricTitle, { color: theme.secondaryText }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingBottom: 40, gap: 16 },
  periods: { gap: 10, paddingHorizontal: 20 },
  period: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  periodText: { fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, paddingTop: 8 },
  grid: { flexDirection: 'row', gap: 16, paddingHorizontal: 20 },
  metric: { flex: 1, padding: 16, borderRadius: 14, gap: 10 },
  metricIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricTitle: { fontSize: 13 },
});
