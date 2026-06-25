/**
 * Expenses — port of ExpenseListView.swift.
 * Search + category filter + summary + swipe-to-delete list.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExpenseRow } from '@/components/accounting/expense-row';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { SwipeToDelete } from '@/components/swipe-to-delete';
import { useExpenses } from '@/context/expenses-store';
import { withOpacity } from '@/lib/color';
import { EXPENSE_CATEGORIES } from '@/models/expense';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PURPLE = '#9966E6';
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default function Expenses() {
  const theme = useAppTheme();
  const router = useRouter();
  const { expenses, deleteExpense } = useExpenses();
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  let filtered = expenses;
  if (category) filtered = filtered.filter((e) => e.category === category);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e) => e.vendorName?.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q),
    );
  }
  filtered = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          title="Expenses"
          right={
            <Pressable onPress={() => router.push('/accounting/record-expense')} hitSlop={8}>
              <Icon name="plus.circle.fill" size={24} color={PURPLE} />
            </Pressable>
          }
        />

        <View style={styles.controls}>
          <View style={[styles.search, { backgroundColor: theme.cardBackground }]}>
            <Icon name="magnifyingglass" size={16} color={theme.secondaryText} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search expenses..." placeholderTextColor={theme.tertiaryText} style={[styles.searchInput, { color: theme.primaryText }]} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            <Pill label="All" active={category === null} onPress={() => setCategory(null)} />
            {EXPENSE_CATEGORIES.map((c) => (
              <Pill key={c.value} label={c.value} icon={c.icon} active={category === c.value} onPress={() => setCategory(c.value)} />
            ))}
          </ScrollView>

          <View style={styles.summary}>
            <Text style={[styles.count, { color: theme.secondaryText }]}>
              {filtered.length} expense{filtered.length === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.total, { color: PURPLE }]}>Total: {usd.format(total)}</Text>
          </View>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="tray" size={40} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No expenses found</Text>
            <Pressable onPress={() => router.push('/accounting/record-expense')} style={[styles.recordBtn, { backgroundColor: PURPLE }]}>
              <Text style={styles.recordText}>Record an Expense</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.map((e) => (
              <SwipeToDelete key={e.id} onDelete={() => deleteExpense(e.id)}>
                <ExpenseRow expense={e} />
              </SwipeToDelete>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Pill({ label, icon, active, onPress }: { label: string; icon?: SFSymbol; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: active ? PURPLE : withOpacity(PURPLE, 0.1) }]}>
      {icon ? <Icon name={icon} size={11} color={active ? '#FFFFFF' : PURPLE} /> : null}
      <Text style={[styles.pillText, { color: active ? '#FFFFFF' : PURPLE }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  controls: { gap: 16, paddingTop: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginHorizontal: 20, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  pills: { gap: 8, paddingHorizontal: 20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pillText: { fontSize: 12, fontWeight: '500' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  count: { fontSize: 13 },
  total: { fontSize: 13, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
  recordBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  recordText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  list: { padding: 16, gap: 8, paddingBottom: 40 },
});
