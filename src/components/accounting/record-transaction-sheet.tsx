/**
 * RecordTransactionSheet — port of RecordTransactionView.swift.
 * Modal form to add an income/expense transaction.
 */

import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { Icon } from '@/components/icon';
import { DatePickerSheet } from '@/components/sheets/date-picker-sheet';
import { useAccounting } from '@/context/accounting-store';
import type { TransactionCategory } from '@/models/transaction';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export function RecordTransactionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const { addTransaction } = useAccounting();

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Income');
  const [date, setDate] = useState(new Date().toISOString());
  const [note, setNote] = useState('');
  const [dateSheet, setDateSheet] = useState(false);

  const valid = title.trim().length > 0 && !Number.isNaN(Number(amount)) && amount.length > 0;

  const reset = () => {
    setTitle(''); setDetail(''); setAmount(''); setCategory('Income');
    setDate(new Date().toISOString()); setNote('');
  };

  const save = () => {
    if (!valid) return;
    addTransaction({ title, detail, amount: Number(amount), category, date, note });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={onClose} hitSlop={8}><Text style={styles.action}>Cancel</Text></Pressable>
            <Text style={[styles.title, { color: theme.primaryText }]}>Record Transaction</Text>
            <Pressable onPress={save} disabled={!valid} hitSlop={8}>
              <Text style={[styles.action, !valid ? styles.disabled : null]}>Save</Text>
            </Pressable>
          </View>

          <KeyboardAwareForm contentContainerStyle={styles.body}>
            <Field label="Title" placeholder="e.g. Sarah Johnson" value={title} onChangeText={setTitle} />
            <Field label="Description" placeholder="e.g. Haircut & Styling" value={detail} onChangeText={setDetail} />
            <Field label="Amount" placeholder="0.00" value={amount} onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType />

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>TYPE</Text>
              <View style={[styles.segmented, { backgroundColor: theme.inputBackground }]}>
                {(['Income', 'Expense'] as TransactionCategory[]).map((c) => (
                  <Pressable key={c} onPress={() => setCategory(c)} style={[styles.segment, category === c ? { backgroundColor: theme.cardBackground } : null]}>
                    <Text style={[styles.segmentText, { color: category === c ? (c === 'Income' ? iOSColors.green : iOSColors.red) : theme.secondaryText }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>DATE</Text>
              <Pressable onPress={() => setDateSheet(true)} style={[styles.input, styles.dateRow, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.dateText, { color: theme.primaryText }]}>{dateFmt.format(new Date(date))}</Text>
                <Icon name="calendar" size={16} color={theme.secondaryText} />
              </Pressable>
            </View>

            <Field label="Note" placeholder="Optional note" value={note} onChangeText={setNote} />
          </KeyboardAwareForm>
        </SafeAreaView>
      </DashboardGradient>

      <DatePickerSheet visible={dateSheet} date={date} onChange={setDate} onClose={() => setDateSheet(false)} />
    </Modal>
  );
}

function Field({
  label, placeholder, value, onChangeText, keyboardType,
}: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void; keyboardType?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.tertiaryText}
        keyboardType={keyboardType ? 'decimal-pad' : 'default'}
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  action: { fontSize: 16, fontWeight: '600', color: iOSColors.blue },
  disabled: { opacity: 0.4 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 20, gap: 16, paddingBottom: 40 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 10, gap: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText: { fontSize: 16 },
});
