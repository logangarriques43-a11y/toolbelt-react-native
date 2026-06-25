/**
 * TransactionRow — a single income/expense transaction. Port of TransactionRow
 * (AccountingView.swift). Shared by the hub's recent list and the full list.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { withOpacity } from '@/lib/color';
import type { Transaction } from '@/models/transaction';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
});

export function TransactionRow({ transaction: t }: { transaction: Transaction }) {
  const theme = useAppTheme();
  const income = t.category === 'Income';
  const color = income ? iOSColors.green : iOSColors.red;

  return (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
      <View style={[styles.iconCircle, { backgroundColor: withOpacity(color, 0.2) }]}>
        <Icon name={income ? 'arrow.down.circle.fill' : 'arrow.up.circle.fill'} size={24} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.primaryText }]}>{t.title}</Text>
        {t.detail ? <Text style={[styles.detail, { color: theme.secondaryText }]}>{t.detail}</Text> : null}
        <Text style={[styles.date, { color: withOpacity(iOSColors.gray, 0.8) }]}>{dateFmt.format(new Date(t.date))}</Text>
      </View>
      <Text style={[styles.amount, { color }]}>
        {income ? '+' : '-'}{usd.format(t.amount)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 12 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: '600' },
  detail: { fontSize: 14 },
  date: { fontSize: 12 },
  amount: { fontSize: 18, fontWeight: '700' },
});
