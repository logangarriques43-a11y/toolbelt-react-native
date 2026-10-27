/**
 * Analytics — port of AnalyticsView.swift.
 * Period pills + metric-card sections, computed from live store data. The period
 * pill filters appointments (by start) and clients (by createdAt); the
 * appointment lifecycle status drives the Completed / Cancelled / No-Show cards.
 * Invoice cards come from the invoices store (created this period); AI SMS cards
 * come from the backend /sms/analytics endpoint, period-scoped to match the pills.
 */

import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedIconTile } from '@/components/themed';
import { useAppointments } from '@/context/appointments-store';
import { useClients } from '@/context/clients-store';
import { useInvoices } from '@/context/invoices-store';
import { useSmsAnalytics } from '@/context/sms-store';
import { compactMoney } from '@/lib/compact-money';
import { invoiceTotalDue } from '@/models/invoice';
import type { SmsAnalyticsPeriod } from '@/api/sms';
import { useAppTheme } from '@/theme/theme-context';

type Period = 'This Week' | 'This Month' | 'This Quarter' | 'This Year';
const PERIODS: Period[] = ['This Week', 'This Month', 'This Quarter', 'This Year'];
const PERIOD_NOUN: Record<Period, string> = { 'This Week': 'Week', 'This Month': 'Month', 'This Quarter': 'Quarter', 'This Year': 'Year' };
const PERIOD_API: Record<Period, SmsAnalyticsPeriod> = { 'This Week': 'week', 'This Month': 'month', 'This Quarter': 'quarter', 'This Year': 'year' };

/** Start of the selected period (local time). */
function periodStart(period: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case 'This Week': d.setDate(d.getDate() - d.getDay()); break; // back to Sunday
    case 'This Month': d.setDate(1); break;
    case 'This Quarter': d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1); break;
    case 'This Year': d.setMonth(0, 1); break;
  }
  return d;
}

export default function Analytics() {
  const theme = useAppTheme();
  const { clients } = useClients();
  const { appointments } = useAppointments();
  const { invoices } = useInvoices();
  const [period, setPeriod] = useState<Period>('This Month');
  const sms = useSmsAnalytics(PERIOD_API[period]);

  const start = periodStart(period).getTime();
  const inPeriod = appointments.filter((a) => new Date(a.startTime).getTime() >= start);
  const completed = inPeriod.filter((a) => a.status === 'completed');
  const cancelled = inPeriod.filter((a) => a.status === 'cancelled');
  const noShows = inPeriod.filter((a) => a.status === 'noShow');
  const revenue = completed.reduce((sum, a) => sum + a.price, 0);
  const uniqueClients = new Set(inPeriod.map((a) => a.clientId)).size;
  const avgPerClient = uniqueClients ? revenue / uniqueClients : 0;
  const newClients = clients.filter((c) => c.createdAt != null && new Date(c.createdAt).getTime() >= start).length;

  // Invoices created this period: "sent" counts anything dispatched (sent or
  // paid); "pending" is the total still owed on sent-but-unpaid invoices.
  const invoicesInPeriod = invoices.filter((i) => new Date(i.createdAt).getTime() >= start);
  const invoicesSent = invoicesInPeriod.filter((i) => i.status === 'sent' || i.status === 'paid').length;
  const pendingAmount = invoicesInPeriod
    .filter((i) => i.status === 'sent')
    .reduce((sum, i) => sum + invoiceTotalDue(i), 0);

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
                style={[styles.period, { backgroundColor: period === p ? theme.accent : theme.accentSoft, borderRadius: theme.isEditorial ? 2 : 999 }]}>
                <Text style={[styles.periodText, { color: period === p ? theme.onAccent : theme.accent }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <SectionTitle title="Revenue" />
          <Grid>
            <Metric title="Total Revenue" value={compactMoney(revenue)} icon="dollarsign.circle.fill" />
            <Metric title="Avg per Client" value={compactMoney(avgPerClient)} icon="person.fill" />
          </Grid>
          <Grid>
            <Metric title="Invoices Sent" value={String(invoicesSent)} icon="doc.text.fill" />
            <Metric title="Pending" value={compactMoney(pendingAmount)} icon="clock.fill" />
          </Grid>

          <SectionTitle title="Appointments" />
          <Grid>
            <Metric title="Total Booked" value={String(inPeriod.length)} icon="calendar.badge.plus" />
            <Metric title="Completed" value={String(completed.length)} icon="checkmark.circle.fill" />
          </Grid>
          <Grid>
            <Metric title="Cancelled" value={String(cancelled.length)} icon="xmark.circle.fill" />
            <Metric title="No-Shows" value={String(noShows.length)} icon="person.fill.xmark" />
          </Grid>

          <SectionTitle title="AI SMS" />
          <Grid>
            <Metric title="Messages Sent" value={String(sms?.totalMessagesOutbound ?? 0)} icon="arrow.up.message.fill" />
            <Metric title="Messages Received" value={String(sms?.totalMessagesInbound ?? 0)} icon="arrow.down.message.fill" />
          </Grid>
          <Grid>
            <Metric title="Conversations" value={String(sms?.totalConversations ?? 0)} icon="bubble.left.and.text.bubble.right.fill" />
            <Metric title="AI Booked" value={String(sms?.appointmentsBooked ?? 0)} icon="sparkles" />
          </Grid>

          <SectionTitle title="Clients" />
          <Grid>
            <Metric title="Total Clients" value={String(clients.length)} icon="person.2.fill" />
            <Metric title={`New This ${PERIOD_NOUN[period]}`} value={String(newClients)} icon="person.badge.plus" />
          </Grid>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.sectionTitle, theme.display(22)]}>{title}</Text>;
}

function Grid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

function Metric({ title, value, icon }: { title: string; value: string; icon: SFSymbol }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.metric, theme.card]}>
      <ThemedIconTile name={icon} size={36} />
      <Text style={theme.display(24, '500')}>{value}</Text>
      <Text style={[styles.metricTitle, { color: theme.secondaryText }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingBottom: 40, gap: 16 },
  periods: { gap: 10, paddingHorizontal: 20 },
  period: { paddingHorizontal: 16, paddingVertical: 10 },
  periodText: { fontSize: 14, fontWeight: '500' },
  sectionTitle: { paddingHorizontal: 20, paddingTop: 8 },
  grid: { flexDirection: 'row', gap: 16, paddingHorizontal: 20 },
  metric: { flex: 1, padding: 16, gap: 10 },
  metricTitle: { fontSize: 13 },
});
