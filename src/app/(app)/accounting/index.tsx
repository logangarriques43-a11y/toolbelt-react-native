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
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecordTransactionSheet } from '@/components/accounting/record-transaction-sheet';
import { TransactionRow } from '@/components/accounting/transaction-row';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAccounting } from '@/context/accounting-store';
import { useExpenses } from '@/context/expenses-store';
import { withOpacity } from '@/lib/color';
import { compactMoney } from '@/lib/compact-money';
import { TRANSACTION_PERIODS, type TransactionPeriod } from '@/models/transaction';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function Accounting() {
  const theme = useAppTheme();
  const router = useRouter();
  const acct = useAccounting();
  const exp = useExpenses();
  const [period, setPeriod] = useState<TransactionPeriod>('Lifetime');
  const [recordOpen, setRecordOpen] = useState(false);

  const income = acct.totalIncome(period);
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
              <Icon name="square.and.arrow.up" size={20} color={iOSColors.blue} />
            </Pressable>
          }
        />

        <ScrollView contentContainerStyle={styles.body}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
            {TRANSACTION_PERIODS.map((p) => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.period, { borderColor: iOSColors.blue, backgroundColor: period === p ? iOSColors.blue : theme.cardBackground }]}>
                <Text style={[styles.periodText, { color: period === p ? '#FFFFFF' : iOSColors.blue }]}>{p}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Net revenue card */}
          <Pressable onPress={() => router.push('/accounting/financial-overview')} style={styles.section}>
            <Gradient
              colors={[withOpacity(iOSColors.blue, 0.1), withOpacity(iOSColors.purple, 0.05)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.netCard, { borderColor: withOpacity(iOSColors.blue, 0.2) }]}>
              <View style={styles.netText}>
                <Text style={[styles.netLabel, { color: theme.secondaryText }]}>Net Revenue</Text>
                <Text style={[styles.netValue, { color: theme.primaryText }]} numberOfLines={1}>{compactMoney(net)}</Text>
              </View>
              <View style={styles.netRight}>
                <Icon name="chart.line.uptrend.xyaxis" size={50} color={withOpacity(iOSColors.blue, 0.3)} />
                <Icon name="chevron.right" size={12} weight="semibold" color={theme.secondaryText} />
              </View>
            </Gradient>
          </Pressable>

          {/* Income / Expense */}
          <View style={styles.statRow}>
            <StatCard title="Income" value={compactMoney(income)} icon="arrow.down.circle.fill" color={iOSColors.green} />
            <StatCard title="Expenses" value={compactMoney(expenses)} icon="arrow.up.circle.fill" color={iOSColors.red} />
          </View>

          {/* Quick actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Quick Actions</Text>
            <ActionButton icon="plus.circle.fill" title="Record Transaction" color={iOSColors.blue} onPress={() => setRecordOpen(true)} />
            <ActionButton icon="doc.text.fill" title="Create Invoice" color={iOSColors.purple} onPress={() => router.push('/accounting/create-invoice')} />
            <ActionButton icon="doc.text.magnifyingglass" title="View Invoices" color={iOSColors.indigo} onPress={() => router.push('/accounting/invoices')} />
            <ActionButton icon="chart.bar.fill" title="View Reports" color={iOSColors.green} onPress={() => router.push('/accounting/reports')} />
          </View>

          {/* Recent */}
          <View style={styles.section}>
            <View style={styles.recentHead}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Recent Transactions</Text>
              <Pressable onPress={() => router.push('/accounting/transactions')}>
                <Text style={[styles.viewAll, { color: iOSColors.blue }]}>View All</Text>
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
    <View style={[styles.statCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={[styles.statValue, { color: theme.primaryText }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.secondaryText }]}>{title}</Text>
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
  body: { paddingBottom: 40, gap: 24 },
  periods: { gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  period: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  periodText: { fontSize: 14, fontWeight: '500' },
  section: { gap: 12, paddingHorizontal: 16 },
  netCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 16, borderWidth: 1 },
  netText: { flex: 1, gap: 8 },
  netLabel: { fontSize: 16 },
  netValue: { fontSize: 36, fontWeight: '700' },
  netRight: { alignItems: 'center', gap: 6 },
  statRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statCard: { flex: 1, padding: 16, borderRadius: 12, gap: 12 },
  statValue: { fontSize: 24, fontWeight: '700' },
  statTitle: { fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { flex: 1, fontSize: 16, fontWeight: '500' },
  recentHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: { fontSize: 14, fontWeight: '500' },
  empty: { fontSize: 14 },
});
