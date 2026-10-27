/**
 * ExpenseRow — a single expense. Port of ExpenseRowView (ExpenseListView.swift).
 */

import { StyleSheet, Text, View } from 'react-native';

import { ThemedIconTile } from '@/components/themed';
import { withOpacity } from '@/lib/color';
import { expenseCategoryIcon, expenseDateString, type Expense } from '@/models/expense';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function ExpenseRow({ expense: e }: { expense: Expense }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, theme.card]}>
      <ThemedIconTile name={expenseCategoryIcon(e.category)} size={44} />
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.primaryText }]}>{e.vendorName || e.category}</Text>
        {e.description ? <Text numberOfLines={1} style={[styles.detail, { color: theme.secondaryText }]}>{e.description}</Text> : null}
        <View style={styles.badges}>
          <Text style={[styles.date, { color: theme.tertiaryText }]}>{expenseDateString(e.date)}</Text>
          {e.isTaxDeductible ? <Badge label="Deductible" color={iOSColors.green} /> : null}
          {e.isRecurring ? <Badge label="Recurring" color={theme.accent} /> : null}
        </View>
      </View>
      <Text style={styles.amount}>-{usd.format(e.amount)}</Text>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.badge, { color, backgroundColor: withOpacity(color, 0.1) }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  date: { fontSize: 11 },
  badge: { fontSize: 10, fontWeight: '500', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  amount: { fontSize: 16, fontWeight: '700', color: iOSColors.red },
});
