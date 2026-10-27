/**
 * Tax Dashboard — port of TaxDashboardView.swift.
 * Tax mode (manual rate vs Stripe auto), reporting period, tax summary, and a
 * monthly breakdown. Derived locally from recorded income transactions + checkout
 * sales (which carry their actual collected tax) + deductible expenses: a sale's
 * own taxAmount is used when present, manual income falls back to the rate
 * estimate. The AI Tax Analysis card opens accounting/tax-analysis (Claude via
 * POST /tax/ai-analysis). Stripe Tax calculation and the payment-method
 * breakdown are deferred.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useAccounting } from '@/context/accounting-store';
import { useExpenses } from '@/context/expenses-store';
import { useSales } from '@/context/sales-store';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type TaxPeriod = 'This Month' | 'Last Month' | 'This Quarter' | 'This Year' | 'All Time';
const TAX_PERIODS: TaxPeriod[] = ['This Month', 'Last Month', 'This Quarter', 'This Year', 'All Time'];

function periodRange(period: TaxPeriod, now = new Date()): [number, number] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const end = now.getTime();
  switch (period) {
    case 'This Month':
      return [new Date(y, m, 1).getTime(), end];
    case 'Last Month':
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()];
    case 'This Quarter':
      return [new Date(y, Math.floor(m / 3) * 3, 1).getTime(), end];
    case 'This Year':
      return [new Date(y, 0, 1).getTime(), end];
    case 'All Time':
      return [0, end];
  }
}

export default function TaxDashboard() {
  const theme = useAppTheme();
  const router = useRouter();
  const { transactions } = useAccounting();
  const { expenses } = useExpenses();
  const { sales } = useSales();

  const [autoCalculate, setAutoCalculate] = useState(false);
  const [rate, setRate] = useState('8.25');
  const [period, setPeriod] = useState<TaxPeriod>('This Month');

  const rateValue = Number(rate) || 0;
  const PURPLE = theme.accent;
  const TEAL = theme.primaryText;

  const { grossSales, estimatedTax, deductible, monthly } = useMemo(() => {
    const [start, end] = periodRange(period);
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t <= end;
    };
    // Income events: manual income (tax = null → rate estimate) + sales (tax = its
    // own collected amount, gross = the tax-inclusive total).
    type Ev = { date: string; gross: number; tax: number | null };
    const events: Ev[] = [
      ...transactions.filter((t) => t.category === 'Income').map((t) => ({ date: t.date, gross: t.amount, tax: null })),
      ...sales.map((s) => ({ date: s.date, gross: s.totalAmount, tax: s.taxAmount ?? 0 })),
    ];
    const taxOf = (e: Ev) => (e.tax != null ? e.tax : e.gross * (rateValue / (100 + rateValue)));
    const inR = events.filter((e) => inRange(e.date));
    const gross = inR.reduce((s, e) => s + e.gross, 0);
    const tax = inR.reduce((s, e) => s + taxOf(e), 0);
    const ded = expenses.filter((e) => inRange(e.date) && e.isTaxDeductible).reduce((s, e) => s + e.amount, 0);

    const groups = new Map<string, { gross: number; tax: number }>();
    for (const e of inR) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const g = groups.get(key) ?? { gross: 0, tax: 0 };
      g.gross += e.gross;
      g.tax += taxOf(e);
      groups.set(key, g);
    }
    const byMonth = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
    return { grossSales: gross, estimatedTax: tax, deductible: ded, monthly: byMonth };
  }, [transactions, sales, expenses, period, rateValue]);

  const exportReport = async () => {
    const lines = [
      `Tax Report — ${period}`,
      `Gross Sales: ${usd.format(grossSales)}`,
      `Estimated Tax (${rateValue}%): ${usd.format(estimatedTax)}`,
      `Net Revenue: ${usd.format(grossSales - estimatedTax)}`,
      `Deductible Expenses: ${usd.format(deductible)}`,
    ];
    try {
      await Share.share({ title: 'Tax Report', message: lines.join('\n') });
    } catch {
      // cancelled
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Tax Dashboard" />
        <KeyboardAwareForm contentContainerStyle={styles.body}>
          {/* Tax mode */}
          <View style={[styles.card, theme.card]}>
            <View style={styles.modeRow}>
              <Icon name="building.columns.fill" size={24} color={PURPLE} />
              <View style={styles.modeText}>
                <Text style={[styles.modeTitle, { color: theme.primaryText }]}>Tax Calculation Mode</Text>
                <Text style={[styles.modeSub, { color: theme.secondaryText }]}>
                  {autoCalculate ? 'Stripe Tax (Automatic)' : `Manual Rate (${rateValue.toFixed(2)}%)`}
                </Text>
              </View>
              <Switch value={autoCalculate} onValueChange={setAutoCalculate} trackColor={{ true: PURPLE, false: theme.divider }} />
            </View>
            {!autoCalculate ? (
              <View style={[styles.rateRow, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.rateLabel, { color: theme.primaryText }]}>Sales Tax Rate (%)</Text>
                <TextInput
                  value={rate}
                  onChangeText={(t) => setRate(t.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  style={[styles.rateInput, { color: PURPLE }]}
                />
              </View>
            ) : null}
          </View>

          {/* Period */}
          <View style={[styles.card, theme.card]}>
            <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Reporting Period</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
              {TAX_PERIODS.map((p) => (
                <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.period, { borderRadius: theme.isEditorial ? 2 : 999, backgroundColor: period === p ? theme.accent : theme.accentSoft }]}>
                  <Text style={[styles.periodText, { color: period === p ? theme.onAccent : theme.accent }]}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Summary */}
          <View style={[styles.card, theme.card]}>
            <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Tax Summary</Text>
            <View style={styles.metricGrid}>
              <MetricCard label="Gross Sales" value={grossSales} color={PURPLE} />
              <MetricCard label="Tax Collected" value={estimatedTax} color={iOSColors.green} />
            </View>
            <View style={styles.metricGrid}>
              <MetricCard label="Net Revenue" value={grossSales - estimatedTax} color={TEAL} />
              <MetricCard label="Deductible" value={deductible} color={theme.primaryText} />
            </View>
          </View>

          {/* Monthly breakdown */}
          {monthly.length > 0 ? (
            <View style={[styles.card, theme.card]}>
              <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Monthly Breakdown</Text>
              {monthly.map(([key, m]) => {
                const monthIdx = Number(key.split('-')[1]) - 1;
                return (
                  <View key={key} style={[styles.monthRow, { backgroundColor: theme.inputBackground }]}>
                    <Text style={[styles.monthName, { color: theme.primaryText }]}>{MONTHS[monthIdx]}</Text>
                    <View style={styles.monthCols}>
                      <MonthCol label="Gross" value={m.gross} color={PURPLE} />
                      <MonthCol label="Tax" value={m.tax} color={iOSColors.green} />
                      <MonthCol label="Net" value={m.gross - m.tax} color={TEAL} />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {/* AI analysis */}
          <Pressable onPress={() => router.push('/accounting/tax-analysis')} style={[styles.card, styles.aiCard, theme.card]}>
            <ThemedIconTile name="brain" size={48} />
            <View style={styles.aiText}>
              <Text style={[styles.aiTitle, { color: theme.primaryText }]}>AI Tax Analysis</Text>
              <Text style={[styles.aiSub, { color: theme.secondaryText }]}>Get AI-powered insights on deductions and filing</Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.secondaryText} />
          </Pressable>

          <ThemedButton title="Export Tax Report" kind="accent" icon="square.and.arrow.up" onPress={exportReport} />
        </KeyboardAwareForm>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.inputBackground }]}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{usd.format(value)}</Text>
    </View>
  );
}

function MonthCol({ label, value, color }: { label: string; value: number; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.monthCol}>
      <Text style={[styles.monthColLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.monthColValue, { color }]} numberOfLines={1}>{usd.format(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  card: { padding: 16, gap: 12 },
  cardLabel: { fontSize: 14, fontWeight: '600' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeText: { flex: 1, gap: 4 },
  modeTitle: { fontSize: 16, fontWeight: '600' },
  modeSub: { fontSize: 13 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 10 },
  rateLabel: { fontSize: 14 },
  rateInput: { fontSize: 14, fontWeight: '600', textAlign: 'right', minWidth: 80, paddingVertical: 4, textAlignVertical: 'center' },
  periods: { gap: 8 },
  period: { paddingHorizontal: 14, paddingVertical: 8 },
  periodText: { fontSize: 13, fontWeight: '500' },
  metricGrid: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 10 },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  metricValue: { fontSize: 18, fontWeight: '700' },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 8 },
  monthName: { fontSize: 13, fontWeight: '600' },
  monthCols: { flexDirection: 'row', gap: 16 },
  monthCol: { alignItems: 'flex-end', gap: 2 },
  monthColLabel: { fontSize: 10, fontWeight: '500' },
  monthColValue: { fontSize: 12, fontWeight: '600' },
  aiCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  aiText: { flex: 1, gap: 4 },
  aiTitle: { fontSize: 16, fontWeight: '600' },
  aiSub: { fontSize: 12 },
});
