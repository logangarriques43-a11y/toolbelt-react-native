/**
 * Record Expense — port of RecordExpenseView.swift.
 * Amount, category, vendor, description, date, tax-deductible, recurring, notes.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { useExpenses } from '@/context/expenses-store';
import { withOpacity } from '@/lib/color';
import { EXPENSE_CATEGORIES, type RecurringFrequency } from '@/models/expense';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const PURPLE = '#9966E6';
const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const FREQ: RecurringFrequency[] = ['monthly', 'quarterly', 'annually'];

export default function RecordExpense() {
  const theme = useAppTheme();
  const router = useRouter();
  const { addExpense } = useExpenses();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Supplies');
  const [vendor, setVendor] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [deductible, setDeductible] = useState(true);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [notes, setNotes] = useState('');
  const [dateSheet, setDateSheet] = useState(false);

  const valid = amount.length > 0 && Number(amount) > 0;

  const save = () => {
    if (!valid) return;
    addExpense({
      date,
      amount: Number(amount),
      category,
      vendorName: vendor || undefined,
      description,
      isTaxDeductible: deductible,
      isRecurring: recurring,
      recurringFrequency: recurring ? frequency : undefined,
      notes,
    });
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Record Expense" />
        <ScrollView contentContainerStyle={styles.body}>
          {/* Amount */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Amount</Text>
            <View style={[styles.amountBox, { backgroundColor: withOpacity(PURPLE, 0.06) }]}>
              <Text style={[styles.dollar, { color: PURPLE }]}>$</Text>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={theme.tertiaryText}
                keyboardType="decimal-pad"
                style={[styles.amountInput, { color: theme.primaryText }]}
              />
            </View>
          </View>

          {/* Details */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Details</Text>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {EXPENSE_CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <Pressable key={c.value} onPress={() => setCategory(c.value)} style={[styles.catPill, { backgroundColor: active ? PURPLE : withOpacity(PURPLE, 0.1) }]}>
                    <Icon name={c.icon} size={12} color={active ? '#FFFFFF' : PURPLE} />
                    <Text style={[styles.catText, { color: active ? '#FFFFFF' : PURPLE }]}>{c.value}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Vendor / Payee</Text>
            <TextInput value={vendor} onChangeText={setVendor} placeholder="e.g. Office Depot" placeholderTextColor={theme.tertiaryText} style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: theme.fieldBorder }]} />

            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="What was this expense for?" placeholderTextColor={theme.tertiaryText} style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: theme.fieldBorder }]} />

            <Pressable onPress={() => setDateSheet(true)} style={styles.dateRow}>
              <Text style={[styles.fieldLabel, { color: theme.secondaryText, marginBottom: 0 }]}>Date</Text>
              <Text style={[styles.dateValue, { color: theme.primaryText }]}>{dateFmt.format(new Date(date))}</Text>
            </Pressable>
          </View>

          {/* Tax */}
          <View style={[styles.card, styles.toggleCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={styles.toggleText}>
              <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>Tax Deductible</Text>
              <Text style={[styles.toggleSub, { color: theme.secondaryText }]}>Mark if this expense can be deducted from taxes</Text>
            </View>
            <Switch value={deductible} onValueChange={setDeductible} trackColor={{ true: iOSColors.green, false: theme.divider }} />
          </View>

          {/* Recurring */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleTitle, { color: theme.primaryText }]}>Recurring Expense</Text>
              <Switch value={recurring} onValueChange={setRecurring} trackColor={{ true: PURPLE, false: theme.divider }} />
            </View>
            {recurring ? (
              <View style={[styles.segmented, { backgroundColor: theme.inputBackground }]}>
                {FREQ.map((f) => (
                  <Pressable key={f} onPress={() => setFrequency(f)} style={[styles.segment, frequency === f ? { backgroundColor: theme.cardBackground } : null]}>
                    <Text style={[styles.segmentText, { color: frequency === f ? theme.primaryText : theme.secondaryText }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Notes */}
          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.cardLabel, { color: theme.secondaryText }]}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Optional notes..." placeholderTextColor={theme.tertiaryText} multiline style={[styles.input, styles.notes, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: theme.fieldBorder }]} />
          </View>

          <Pressable onPress={save} disabled={!valid} style={[styles.save, { backgroundColor: PURPLE, opacity: valid ? 1 : 0.5 }]}>
            <Icon name="plus.circle.fill" size={16} color="#FFFFFF" />
            <Text style={styles.saveText}>Save Expense</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <DatePickerSheet visible={dateSheet} date={date} onChange={setDate} onClose={() => setDateSheet(false)} />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 20, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 14, gap: 12 },
  cardLabel: { fontSize: 14, fontWeight: '600' },
  amountBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: 12 },
  dollar: { fontSize: 28, fontWeight: '700' },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700', padding: 0 },
  fieldLabel: { fontSize: 13, marginBottom: -4 },
  catRow: { gap: 8 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  catText: { fontSize: 12, fontWeight: '500' },
  input: { fontSize: 15, padding: 12, borderRadius: 10, borderWidth: 1 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue: { fontSize: 15, fontWeight: '500' },
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleText: { flex: 1, gap: 4 },
  toggleTitle: { fontSize: 15, fontWeight: '500' },
  toggleSub: { fontSize: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 10, gap: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '500' },
  notes: { minHeight: 72, textAlignVertical: 'top' },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
