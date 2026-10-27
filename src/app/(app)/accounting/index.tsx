/**
 * Accounting — port of AccountingView.swift (hub).
 * Period selector, net-revenue + income/expense tiles, quick actions, and recent
 * transactions. Totals currently come from manually-recorded transactions;
 * sales (Phase 5) and business expenses (Phase 4b) fold in later. Create Invoice
 * / View Invoices / Reports / Financial Overview navigate once those land.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordTransactionSheet } from '@/components/accounting/record-transaction-sheet';
import { TransactionRow } from '@/components/accounting/transaction-row';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedIconTile } from '@/components/themed';
import { useAccounting } from '@/context/accounting-store';
import { useExpenses } from '@/context/expenses-store';
import { useSales } from '@/context/sales-store';
import { withOpacity } from '@/lib/color';
import { compactMoney } from '@/lib/compact-money';
import { TRANSACTION_PERIODS, type TransactionPeriod } from '@/models/transaction';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function Accounting() {
  const theme = useAppTheme();
  const router = useRouter();
  const acct = useAccounting();
  const exp = useExpenses();
  const sales = useSales();
  const [period, setPeriod] = useState<TransactionPeriod>('Lifetime');
  const [recordOpen, setRecordOpen] = useState(false);

  const income = acct.totalIncome(period) + sales.revenue(period);
  const expenses = acct.totalExpenses(period) + exp.totalAmount(period);
  const net = income - expenses;
  const recent = acct.transactionsFor(period).slice(0, 5);

  const exportCsv = async () => {
    const rows = acct.transactionsFor(period);
    if (rows.length === 0) return Alert.alert('Nothing to export', 'No transactions for this period.');
    const csv = ['Title,Detail,Amount,Category,Date,Note', ...rows.map((t) =>
      [t.title, t.detail, t.amount, t.category, t.date, t.note].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    try {
      await Share.share({ title: `Transactions (${period})`, message: csv });
    } catch {
      // user cancelled
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Accounting"
          right={
            <Pressable onPress={exportCsv} hitSlop={8}>
              <Icon name="square.and.arrow.up" size={20} color={theme.accent} />
            </Pressable>
          }
        />

        <ScrollView contentContainerStyle={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
            {TRANSACTION_PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.period, { borderRadius: theme.isEditorial ? 2 : 999, borderColor: period === p ? theme.accent : theme.divider, backgroundColor: period === p ? theme.accent : theme.cardBackground }]}>
                <Text style={[styles.periodText, { color: period === p ? theme.onAccent : theme.primaryText }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Net revenue card */}
          <Pressable onPress={() => router.push('/accounting/financial-overview')} style={styles.section}>
            <View style={[styles.netCard, { backgroundColor: theme.hero, borderColor: theme.divider, borderRadius: theme.cornerRadius }]}>
              <View style={styles.netText}>
                <Text style={[styles.netLabel, { color: withOpacity(theme.onHero, 0.75) }]}>Net Revenue</Text>
                <Text style={[theme.display(36, '500'), { color: theme.onHero }]} numberOfLines={1}>{compactMoney(net)}</Text>
              </View>
              <View style={styles.netRight}>
                <Icon name="chart.line.uptrend.xyaxis" size={50} color={withOpacity(theme.onHero, 0.3)} />
                <Icon name="chevron.right" size={12} weight="semibold" color={withOpacity(theme.onHero, 0.75)} />
              </View>
            </View>
          </Pressable>

          {/* Income / Expense */}
          <View style={styles.statRow}>
            <StatCard title="Income" value={compactMoney(income)} icon="arrow.down.circle.fill" color={iOSColors.green} />
            <StatCard title="Expenses" value={compactMoney(expenses)} icon="arrow.up.circle.fill" color={iOSColors.red} />
          </View>

          {/* Quick actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Quick Actions</Text>
            <ActionButton icon="plus.circle.fill" title="Record Transaction" onPress={() => setRecordOpen(true)} />
            <ActionButton icon="doc.text.fill" title="Create Invoice" onPress={() => router.push('/accounting/create-invoice')} />
            <ActionButton icon="doc.text.magnifyingglass" title="View Invoices" onPress={() => router.push('/accounting/invoices')} />
            <ActionButton icon="chart.bar.fill" title="View Reports" onPress={() => router.push('/accounting/reports')} />
          </View>

          {/* Recent */}
          <View style={styles.section}>
            <View style={styles.recentHead}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recent Transactions</Text>
              <Pressable onPress={() => router.push('/accounting/transactions')}>
                <Text style={[styles.viewAll, { color: theme.accent }]}>View All</Text>
              </Pressable>
            </View>
            {recent.length === 0 ? (
              <Text style={[styles.empty, { color: theme.secondaryText }]}>No transactions for this period.</Text>
            ) : (
              recent.map((t) => <TransactionRow key={t.id} transaction={t} />)
            )}
          </View>
        </ScrollView>

        <RecordTransactionSheet visible={recordOpen} onClose={() => setRecordOpen(false)} />
      </SafeAreaView>
    </DashboardGradient>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: SFSymbol; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.statCard, theme.card]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={theme.display(24, '500')} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.secondaryText }]}>{title}</Text>
    </View>
  );
}

function ActionButton({ icon, title, onPress }: { icon: SFSymbol; title: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.action, theme.card]}>
      <ThemedIconTile name={icon} size={44} />
      <Text style={[styles.actionTitle, { color: theme.primaryText }]}>{title}</Text>
      <Icon name="chevron.right" size={14} color={theme.secondaryText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingBottom: 40, gap: 24 },
  periods: { gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  period: { paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  periodText: { fontSize: 14, fontWeight: '500' },
  section: { gap: 12, paddingHorizontal: 16 },
  netCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderWidth: 1 },
  netText: { flex: 1, gap: 8 },
  netLabel: { fontSize: 16 },
  netRight: { alignItems: 'center', gap: 6 },
  statRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statCard: { flex: 1, padding: 16, gap: 12 },
  statTitle: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16 },
  actionTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: { fontSize: 14, fontWeight: '500' },
  empty: { fontSize: 14 },
});
