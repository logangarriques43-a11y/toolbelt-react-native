/**
 * Financial Overview — port of FinancialOverviewView.swift.
 * Period summary + a money-flow card + "Manage Finances" links. Income currently
 * comes from recorded income transactions (sales land in Phase 5). The full
 * Sankey money-flow diagram arrives with Revenue Flow (4d) — here it's a simple
 * income-vs-expense bar.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAccounting } from '@/context/accounting-store';
import { useExpenses } from '@/context/expenses-store';
import { withOpacity } from '@/lib/color';
import { useState } from 'react';
import type { TransactionPeriod } from '@/models/transaction';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const REVENUE = '#6680F2';
const PERIODS: TransactionPeriod[] = ['Today', 'This Week', 'This Month', 'This Year'];

export default function FinancialOverview() {
  const theme = useAppTheme();
  const router = useRouter();
  const acct = useAccounting();
  const exp = useExpenses();
  const [period, setPeriod] = useState<TransactionPeriod>('This Month');

  const income = acct.totalIncome(period);
  const expenses = acct.totalExpenses(period) + exp.totalAmount(period);
  const net = income - expenses;
  const flowDenom = income + expenses;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Financial Overview" />
        <ScrollView contentContainerStyle={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
            {PERIODS.map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.period, { borderColor: withOpacity(iOSColors.blue, 0.4), backgroundColor: period === p ? iOSColors.blue : theme.cardBackground }]}>
                <Text style={[styles.periodText, { color: period === p ? '#FFFFFF' : iOSColors.blue }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Summary */}
          <View style={[styles.summary, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Metric label="Income" value={income} color={iOSColors.green} />
            <Metric label="Expenses" value={expenses} color={iOSColors.red} />
            <Metric label="Net Revenue" value={net} color={REVENUE} />
          </View>

          {/* Money flow */}
          <View style={[styles.flowCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={styles.flowHead}>
              <Icon name="chart.bar.xaxis.ascending" size={14} color={REVENUE} />
              <Text style={[styles.flowTitle, { color: theme.primaryText }]}>Money Flow</Text>
              <View style={styles.legend}>
                <LegendDot color={REVENUE} label="Revenue" />
                <LegendDot color={iOSColors.red} label="Expenses" />
              </View>
            </View>
            {flowDenom > 0 ? (
              <>
                <View style={styles.flowBar}>
                  <View style={{ flex: Math.max(income, 0.001), backgroundColor: REVENUE }} />
                  <View style={{ flex: Math.max(expenses, 0.001), backgroundColor: iOSColors.red }} />
                </View>
                <Text style={[styles.flowNote, { color: theme.secondaryText }]}>
                  Detailed money-flow diagram lives in Revenue Flow.
                </Text>
              </>
            ) : (
              <View style={styles.flowEmpty}>
                <Icon name="chart.bar.xaxis.ascending" size={36} color={theme.secondaryText} />
                <Text style={[styles.flowEmptyTitle, { color: theme.primaryText }]}>No revenue data</Text>
                <Text style={[styles.flowEmptySub, { color: theme.secondaryText }]}>Record income to see your money flow</Text>
              </View>
            )}
          </View>

          {/* Manage finances */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Manage Finances</Text>
            <ActionButton icon="chart.bar.xaxis.ascending" title="Revenue Flow" color={REVENUE} onPress={() => router.push('/accounting/revenue-flow')} />
            <ActionButton icon="list.bullet.rectangle.fill" title="Expense List" color={iOSColors.red} onPress={() => router.push('/accounting/expenses')} />
            <ActionButton icon="building.columns.fill" title="Tax Dashboard" color={iOSColors.orange} onPress={() => router.push('/accounting/tax')} />
            <ActionButton icon="doc.text.fill" title="Create Invoice" color={iOSColors.purple} onPress={() => router.push('/accounting/create-invoice')} />
            <ActionButton icon="chart.bar.fill" title="Reports" color={iOSColors.green} onPress={() => router.push('/accounting/reports')} />
            <ActionButton icon="plus.circle.fill" title="Record Expense" color={iOSColors.blue} onPress={() => router.push('/accounting/record-expense')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.metric, { backgroundColor: withOpacity(color, 0.06) }]}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{usd.format(value)}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legendDot}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

function ActionButton({ icon, title, color, onPress }: { icon: SFSymbol; title: string; color: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.action, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.actionTitle, { color: theme.primaryText }]}>{title}</Text>
      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingBottom: 40, gap: 20, paddingTop: 12 },
  periods: { gap: 8, paddingHorizontal: 16 },
  period: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  periodText: { fontSize: 13, fontWeight: '500' },
  summary: { flexDirection: 'row', gap: 8, padding: 12, marginHorizontal: 16, borderRadius: 12 },
  metric: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  metricLabel: { fontSize: 10, fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '700' },
  flowCard: { marginHorizontal: 16, padding: 12, borderRadius: 12, gap: 12 },
  flowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  legend: { flexDirection: 'row', gap: 8 },
  legendDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 10, fontWeight: '500' },
  flowBar: { flexDirection: 'row', height: 28, borderRadius: 8, overflow: 'hidden' },
  flowNote: { fontSize: 12 },
  flowEmpty: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  flowEmptyTitle: { fontSize: 15, fontWeight: '600' },
  flowEmptySub: { fontSize: 13, textAlign: 'center' },
  section: { gap: 12, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
});
