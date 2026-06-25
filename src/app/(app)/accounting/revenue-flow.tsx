/**
 * Revenue Flow — port of RevenueFlowView.swift (+ ExpandedSankeyView).
 * Period summary, a compact tappable Sankey money-flow card, and income/expense
 * breakdowns. Tapping the card opens the full-screen diagram. Income is derived
 * from recorded Income transactions; sales line-items + tax land in Phase 5.
 */

import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SankeyDiagram } from '@/components/accounting/sankey-diagram';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useAccounting } from '@/context/accounting-store';
import { useExpenses } from '@/context/expenses-store';
import { withOpacity } from '@/lib/color';
import { compactMoney } from '@/lib/compact-money';
import { buildSankeyLayout, groupExpenseCategories, groupIncomeSources, SANKEY_REVENUE, type FlowGroup } from '@/lib/sankey';
import { periodContains, type Transaction, type TransactionPeriod } from '@/models/transaction';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const PERIODS: TransactionPeriod[] = ['Today', 'This Week', 'This Month', 'This Year'];

function useFlowData(period: TransactionPeriod) {
  const { transactions } = useAccounting();
  const { expenses } = useExpenses();
  return useMemo(() => {
    const inPeriod = (iso: string) => periodContains(period, iso);
    const incomeTxns = transactions.filter((t: Transaction) => t.category === 'Income' && inPeriod(t.date));
    const periodExpenses = expenses.filter((e) => inPeriod(e.date));
    const incomeSources = groupIncomeSources(incomeTxns);
    const expenseGroups = groupExpenseCategories(periodExpenses);
    const totalIncome = incomeSources.reduce((s, x) => s + x.amount, 0);
    const totalExpenses = expenseGroups.reduce((s, x) => s + x.amount, 0);
    return { incomeSources, expenseGroups, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
  }, [transactions, expenses, period]);
}

export default function RevenueFlow() {
  const theme = useAppTheme();
  const [period, setPeriod] = useState<TransactionPeriod>('This Month');
  const [cardWidth, setCardWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const { incomeSources, expenseGroups, totalIncome, totalExpenses, net } = useFlowData(period);
  const layout = useMemo(
    () => (cardWidth > 0 ? buildSankeyLayout({ incomeSources, expenseGroups, width: cardWidth, height: 180, compact: true }) : null),
    [cardWidth, incomeSources, expenseGroups],
  );

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Revenue Flow" />
        <ScrollView contentContainerStyle={styles.body}>
          <PeriodPills period={period} onSelect={setPeriod} />

          <View style={[styles.summary, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Metric label="Income" value={totalIncome} color={iOSColors.green} />
            <Metric label="Expenses" value={totalExpenses} color={iOSColors.red} />
            <Metric label="Net" value={net} color={SANKEY_REVENUE} />
          </View>

          {totalIncome > 0 ? (
            <Pressable onPress={() => setExpanded(true)} style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={styles.cardHead}>
                <Icon name="chart.bar.xaxis.ascending" size={14} color={SANKEY_REVENUE} />
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Money Flow</Text>
                <Text style={[styles.expandHint, { color: theme.secondaryText }]}>Tap to expand</Text>
                <Icon name="arrow.up.left.and.arrow.down.right" size={10} color={theme.secondaryText} />
              </View>
              <View style={styles.chart} onLayout={(e: LayoutChangeEvent) => setCardWidth(e.nativeEvent.layout.width)}>
                {layout ? <SankeyDiagram layout={layout} width={cardWidth} height={180} compact /> : <View style={{ height: 180 }} />}
              </View>
            </Pressable>
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <Icon name="chart.bar.xaxis.ascending" size={36} color={theme.secondaryText} />
              <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No revenue data</Text>
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Record income to see your money flow</Text>
            </View>
          )}

          {incomeSources.length > 0 ? <Breakdown title="Income Sources" items={incomeSources} total={totalIncome} /> : null}
          {expenseGroups.length > 0 ? <Breakdown title="Expense Categories" items={expenseGroups} total={totalIncome} /> : null}
        </ScrollView>
      </SafeAreaView>

      <ExpandedSankey visible={expanded} onClose={() => setExpanded(false)} initialPeriod={period} />
    </DashboardGradient>
  );
}

function ExpandedSankey({ visible, onClose, initialPeriod }: { visible: boolean; onClose: () => void; initialPeriod: TransactionPeriod }) {
  const theme = useAppTheme();
  const [period, setPeriod] = useState<TransactionPeriod>(initialPeriod);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const { incomeSources, expenseGroups, totalIncome, totalExpenses, net } = useFlowData(period);
  const layout = useMemo(
    () => (size.w > 0 && size.h > 0 ? buildSankeyLayout({ incomeSources, expenseGroups, width: size.w, height: size.h, compact: false }) : null),
    [size, incomeSources, expenseGroups],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.expHeader}>
            <View>
              <Text style={[styles.expTitle, { color: theme.primaryText }]}>Money Flow</Text>
              <Text style={[styles.expPeriod, { color: theme.secondaryText }]}>{period}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="xmark.circle.fill" size={26} color={withOpacity(theme.secondaryText, 0.5)} />
            </Pressable>
          </View>

          <PeriodPills period={period} onSelect={setPeriod} />

          <View style={styles.miniRow}>
            <Mini label="Income" value={totalIncome} color={iOSColors.green} />
            <Mini label="Expenses" value={totalExpenses} color={iOSColors.red} />
            <Mini label="Net" value={net} color={SANKEY_REVENUE} />
          </View>

          {totalIncome > 0 ? (
            <>
              <View style={styles.expChart} onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
                {layout ? <SankeyDiagram layout={layout} width={size.w} height={size.h} compact={false} /> : null}
              </View>
              <View style={styles.colHeaders}>
                <Text style={[styles.colHeader, styles.colLeft, { color: withOpacity(theme.secondaryText, 0.7) }]}>Income</Text>
                <Text style={[styles.colHeader, styles.colCenter, { color: withOpacity(theme.secondaryText, 0.7) }]}>Total</Text>
                <Text style={[styles.colHeader, styles.colRight, { color: withOpacity(theme.secondaryText, 0.7) }]}>Outflows</Text>
              </View>
            </>
          ) : (
            <View style={styles.expEmpty}>
              <Icon name="chart.bar.xaxis.ascending" size={36} color={theme.secondaryText} />
              <Text style={[styles.emptySub, { color: theme.secondaryText }]}>No revenue data</Text>
            </View>
          )}
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

function PeriodPills({ period, onSelect }: { period: TransactionPeriod; onSelect: (p: TransactionPeriod) => void }) {
  const theme = useAppTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {PERIODS.map((p) => (
        <Pressable key={p} onPress={() => onSelect(p)} style={[styles.pill, { borderColor: withOpacity(iOSColors.blue, 0.4), backgroundColor: period === p ? iOSColors.blue : theme.cardBackground }]}>
          <Text style={[styles.pillText, { color: period === p ? '#FFFFFF' : iOSColors.blue }]}>{p}</Text>
        </Pressable>
      ))}
    </ScrollView>
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

function Mini({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.mini, { backgroundColor: withOpacity(color, 0.06) }]}>
      <Text style={[styles.miniLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.miniValue, { color }]} numberOfLines={1}>{compactMoney(value)}</Text>
    </View>
  );
}

function Breakdown({ title, items, total }: { title: string; items: FlowGroup[]; total: number }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      <View style={[styles.breakdownCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
        {items.map((item) => (
          <View key={item.name} style={styles.breakdownRow}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={[styles.breakdownName, { color: theme.primaryText }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.breakdownAmount, { color: theme.primaryText }]}>{usd.format(item.amount)}</Text>
            {total > 0 ? <Text style={[styles.breakdownPct, { color: theme.secondaryText }]}>{((item.amount / total) * 100).toFixed(1)}%</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingBottom: 30, gap: 14, paddingTop: 12 },
  pills: { gap: 8, paddingHorizontal: 16 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: '500' },
  summary: { flexDirection: 'row', gap: 8, padding: 12, marginHorizontal: 16, borderRadius: 12 },
  metric: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 8, borderRadius: 8 },
  metricLabel: { fontSize: 10, fontWeight: '500' },
  metricValue: { fontSize: 14, fontWeight: '700' },
  card: { marginHorizontal: 16, padding: 12, borderRadius: 12, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  expandHint: { fontSize: 11 },
  chart: { height: 180, borderRadius: 8, overflow: 'hidden' },
  empty: { marginHorizontal: 16, alignItems: 'center', gap: 8, paddingVertical: 32, borderRadius: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '600' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  section: { gap: 8, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  breakdownCard: { borderRadius: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  breakdownName: { flex: 1, fontSize: 13, fontWeight: '500' },
  breakdownAmount: { fontSize: 13, fontWeight: '600' },
  breakdownPct: { fontSize: 11, width: 42, textAlign: 'right' },
  // Expanded
  expHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  expTitle: { fontSize: 20, fontWeight: '700' },
  expPeriod: { fontSize: 12 },
  miniRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  mini: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6, borderRadius: 8 },
  miniLabel: { fontSize: 9, fontWeight: '500' },
  miniValue: { fontSize: 13, fontWeight: '700' },
  expChart: { flex: 1, marginHorizontal: 4 },
  expEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  colHeaders: { flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16 },
  colHeader: { fontSize: 10, fontWeight: '500', flex: 1 },
  colLeft: { textAlign: 'left' },
  colCenter: { textAlign: 'center' },
  colRight: { textAlign: 'right' },
});
