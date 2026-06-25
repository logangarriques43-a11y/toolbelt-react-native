/**
 * All Transactions — port of TransactionListView.swift.
 * Full list (newest first) with swipe-to-delete.
 */

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TransactionRow } from '@/components/accounting/transaction-row';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useAccounting } from '@/context/accounting-store';
import { useAppTheme } from '@/theme/theme-context';

export default function Transactions() {
  const theme = useAppTheme();
  const { transactions, deleteTransaction } = useAccounting();
  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const confirmDelete = (id: string, title: string) =>
    Alert.alert('Delete Transaction', `Are you sure you want to delete "${title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="All Transactions" />
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="tray" size={40} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No transactions yet.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {sorted.map((t) => (
              <SwipeToDelete key={t.id} onDelete={() => confirmDelete(t.id, t.title)}>
                <TransactionRow transaction={t} />
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
});
