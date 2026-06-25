/**
 * Invoice Settings — port of InvoiceSettingsView.swift.
 * Default tax rate, payment-due term, payment terms, and footer note.
 * Local state for now (used by the Invoicing phase later).
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { OptionSheet } from '@/components/sheets/option-sheet';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const DUE_OPTIONS = [7, 14, 21, 30, 45, 60, 90].map((d) => ({ label: `Net ${d} — due in ${d} days`, value: d }));

export default function InvoiceSettings() {
  const theme = useAppTheme();
  const router = useRouter();

  const [taxRate, setTaxRate] = useState('');
  const [dueDays, setDueDays] = useState(30);
  const [terms, setTerms] = useState('');
  const [footer, setFooter] = useState('');
  const [dueSheet, setDueSheet] = useState(false);

  const save = () => {
    if (taxRate) {
      const r = Number(taxRate);
      if (Number.isNaN(r) || r < 0 || r > 100) {
        return Alert.alert('Invalid tax rate', 'Enter a valid rate between 0 and 100.');
      }
    }
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Invoice Settings" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(iOSColors.blue) }]}>
            <Icon name="doc.text.fill" size={30} color={iOSColors.blue} />
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>DEFAULT TAX RATE (%)</Text>
              <View style={styles.taxRow}>
                <TextInput
                  value={taxRate}
                  onChangeText={(t) => setTaxRate(t.replace(/[^0-9.]/g, ''))}
                  placeholder="e.g. 8.5"
                  placeholderTextColor={theme.tertiaryText}
                  keyboardType="decimal-pad"
                  style={[styles.input, styles.flex, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
                />
                <Text style={[styles.percent, { color: theme.secondaryText }]}>%</Text>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>PAYMENT DUE</Text>
              <Pressable onPress={() => setDueSheet(true)} style={[styles.input, styles.dueRow, { backgroundColor: theme.inputBackground }]}>
                <Text style={[styles.dueText, { color: theme.primaryText }]}>Net {dueDays} — due in {dueDays} days</Text>
                <Icon name="chevron.up.chevron.down" size={13} color={theme.secondaryText} />
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>PAYMENT TERMS</Text>
              <TextInput
                value={terms}
                onChangeText={setTerms}
                placeholder="e.g. Payment due within 30 days of invoice date."
                placeholderTextColor={theme.tertiaryText}
                multiline
                style={[styles.input, styles.multiline, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>INVOICE FOOTER NOTE</Text>
              <TextInput
                value={footer}
                onChangeText={setFooter}
                placeholder="e.g. Thank you for your business!"
                placeholderTextColor={theme.tertiaryText}
                multiline
                style={[styles.input, styles.multiline, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
              />
            </View>
          </View>

          <Pressable onPress={save} style={[styles.save, { backgroundColor: iOSColors.blue }]}>
            <Text style={styles.saveText}>Save Settings</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <OptionSheet visible={dueSheet} title="Payment Due" options={DUE_OPTIONS} selected={dueDays} onSelect={setDueDays} onClose={() => setDueSheet(false)} />
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 24, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  form: { alignSelf: 'stretch', gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  flex: { flex: 1 },
  taxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  percent: { fontSize: 16, fontWeight: '500' },
  dueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dueText: { fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  save: { alignSelf: 'stretch', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
