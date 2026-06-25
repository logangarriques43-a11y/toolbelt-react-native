/**
 * ExpenseRow — a single expense. Port of ExpenseRowView (ExpenseListView.swift).
 */

import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import { expenseCategoryIcon, expenseDateString, type Expense } from '@/models/expense';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function ExpenseRow({ expense: e }: { expense: Expense }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }, lightShadow()]}>
      <View style={[styles.iconTile, { backgroundColor: withOpacity(iOSColors.red, 0.1) }]}>
        <Icon name={expenseCategoryIcon(e.category)} size={18} color={iOSColors.red} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.primaryText }]}>{e.vendorName || e.category}</Text>
        {e.description ? <Text numberOfLines={1} style={[styles.detail, { color: theme.secondaryText }]}>{e.description}</Text> : null}
        <View style={styles.badges}>
          <Text style={[styles.date, { color: iOSColors.gray }]}>{expenseDateString(e.date)}</Text>
          {e.isTaxDeductible ? <Badge label="Deductible" color={iOSColors.green} /> : null}
          {e.isRecurring ? <Badge label="Recurring" color={iOSColors.blue} /> : null}
        </View>
      </View>
      <Text style={styles.amount}>-{usd.format(e.amount)}</Text>
    </View>
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return <Text style={[styles.badge, { color, backgroundColor: withOpacity(color, 0.1) }]}>{label}</Text>;
}

function lightShadow() {
  return { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 } as const;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12 },
  iconTile: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '600' },
  detail: { fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  date: { fontSize: 11 },
  badge: { fontSize: 10, fontWeight: '500', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  amount: { fontSize: 16, fontWeight: '700', color: iOSColors.red },
});
