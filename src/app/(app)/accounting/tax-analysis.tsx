/**
 * AI Tax Analysis — port of TaxAIAnalysisView.swift. Reached from the Tax
 * Dashboard's "AI Tax Analysis" card.
 *
 * Pick a period (This Month / Last Month / This Quarter / This Year) and tap
 * Analyze: the screen summarises checkout sales (gross, count, tax collected,
 * top services, payment-method split) and expenses (total, deductible, by
 * category) for that window on-device, then POSTs them to /tax/ai-analysis.
 * Results render as cards — Analysis, Estimated Tax Liability,
 * Recommendations, Deduction Opportunities, Filing Deadlines — with the
 * server's disclaimer. Unlike iOS, "Last Month" stops at the start of this
 * month instead of running to today.
 */

import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTaxAIAnalysis, summarizeExpenses, summarizeSales, type TaxAIAnalysis } from '@/api/tax';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon, type SFSymbol } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useExpenses } from '@/context/expenses-store';
import { useSales } from '@/context/sales-store';
import { ApiError } from '@/lib/api-client';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

type Period = 'This Month' | 'Last Month' | 'This Quarter' | 'This Year';
const PERIODS: Period[] = ['This Month', 'Last Month', 'This Quarter', 'This Year'];
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function periodRange(period: Period, now = new Date()): [number, number] {
  const y = now.getFullYear();
  const m = now.getMonth();
  const end = now.getTime();
  switch (period) {
    case 'This Month':
      return [new Date(y, m, 1).getTime(), end];
    case 'Last Month':
      return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime() - 1];
    case 'This Quarter':
      return [new Date(y, Math.floor(m / 3) * 3, 1).getTime(), end];
    case 'This Year':
      return [new Date(y, 0, 1).getTime(), end];
  }
}

export default function TaxAnalysis() {
  const theme = useAppTheme();
  const { sales } = useSales();
  const { expenses } = useExpenses();

  const [period, setPeriod] = useState<Period>('This Quarter');
  const [result, setResult] = useState<TaxAIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    const [start, end] = periodRange(period);
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= start && t <= end;
    };
    try {
      setResult(
        await getTaxAIAnalysis({
          period,
          transactionSummary: summarizeSales(sales.filter((s) => inRange(s.date))),
          expenseSummary: summarizeExpenses(expenses.filter((e) => inRange(e.date))),
        }),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="AI Tax Analysis" />
        <ScrollView contentContainerStyle={styles.body}>
          {/* Period */}
          <View style={[styles.card, theme.card]}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Analysis Period</Text>
            <View style={[styles.segment, { backgroundColor: theme.inputBackground, borderRadius: theme.isEditorial ? 2 : 10 }]}>
              {PERIODS.map((p) => {
                const active = p === period;
                return (
                  <Pressable
                    key={p}
                    disabled={analyzing}
                    onPress={() => setPeriod(p)}
                    style={[styles.segmentItem, { backgroundColor: active ? theme.cardBackground : 'transparent', borderRadius: theme.isEditorial ? 2 : 8 }]}>
                    <Text
                      style={[styles.segmentText, { color: active ? theme.primaryText : theme.secondaryText }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit>
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ThemedButton
            title={analyzing ? 'Analyzing…' : 'Analyze My Taxes'}
            kind="inverse"
            icon="brain"
            loading={analyzing}
            onPress={analyze}
          />

          {analyzing ? (
            <View style={[styles.card, styles.centerCard, theme.card]}>
              <ActivityIndicator color={theme.accent} />
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Analyzing your financial data…</Text>
              <Text style={[styles.sub, { color: theme.secondaryText }]}>This may take a few seconds</Text>
            </View>
          ) : result ? (
            <Results result={result} />
          ) : error ? (
            <View style={[styles.card, styles.centerCard, theme.card]}>
              <Icon name="exclamationmark.triangle.fill" size={32} color={iOSColors.orange} />
              <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Analysis Failed</Text>
              <Text style={[styles.sub, styles.centerText, { color: theme.secondaryText }]}>{error}</Text>
            </View>
          ) : (
            <View style={[styles.centerCard, styles.empty]}>
              <ThemedIconTile name="brain" size={72} />
              <Text style={[theme.display(20), styles.centerText]}>Get AI-Powered Tax Insights</Text>
              <Text style={[styles.sub, styles.centerText, { color: theme.secondaryText }]}>
                Select a period and tap Analyze to get personalized tax recommendations, deduction opportunities, and filing
                reminders.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Results({ result }: { result: TaxAIAnalysis }) {
  const theme = useAppTheme();
  return (
    <View style={styles.results}>
      {result.analysis ? (
        <View style={[styles.card, theme.card]}>
          <CardHead icon="doc.text.magnifyingglass" title="Analysis" />
          <Text style={[styles.bodyText, { color: theme.primaryText }]}>{result.analysis}</Text>
        </View>
      ) : null}

      {result.estimatedLiability != null && result.estimatedLiability > 0 ? (
        <View style={[styles.card, styles.liability, theme.card]}>
          <View style={styles.flex}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Estimated Tax Liability</Text>
            <Text style={theme.display(28, '600')}>{usd.format(result.estimatedLiability)}</Text>
          </View>
          <Icon name="exclamationmark.circle.fill" size={28} color={iOSColors.red} />
        </View>
      ) : null}

      <ListCard icon="lightbulb.fill" title="Recommendations" bullet="checkmark.circle.fill" items={result.recommendations} />
      <ListCard icon="dollarsign.circle.fill" title="Deduction Opportunities" bullet="arrow.down.circle.fill" items={result.deductionOpportunities} />
      <ListCard icon="calendar.badge.exclamationmark" title="Filing Deadlines" bullet="clock.fill" items={result.filingDeadlines} />

      {result.disclaimer ? (
        <Text style={[styles.disclaimer, { color: theme.tertiaryText }]}>{result.disclaimer}</Text>
      ) : null}
    </View>
  );
}

function CardHead({ icon, title }: { icon: SFSymbol; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.cardHead}>
      <ThemedIconTile name={icon} size={30} />
      <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
    </View>
  );
}

function ListCard({ icon, title, bullet, items }: { icon: SFSymbol; title: string; bullet: SFSymbol; items: string[] }) {
  const theme = useAppTheme();
  if (items.length === 0) return null;
  return (
    <View style={[styles.card, theme.card]}>
      <CardHead icon={icon} title={title} />
      {items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Icon name={bullet} size={16} color={theme.accent} />
          <Text style={[styles.bodyText, styles.flex, { color: theme.primaryText }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 20, gap: 20, paddingBottom: 48 },
  card: { padding: 18, gap: 12 },
  centerCard: { alignItems: 'center', gap: 10 },
  centerText: { textAlign: 'center' },
  empty: { paddingVertical: 24, paddingHorizontal: 12 },
  label: { fontSize: 13, fontWeight: '600' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 14, lineHeight: 20 },
  segment: { flexDirection: 'row', padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  segmentText: { fontSize: 13, fontWeight: '600' },
  results: { gap: 16 },
  bodyText: { fontSize: 15, lineHeight: 22 },
  liability: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  disclaimer: { fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: 8 },
});
