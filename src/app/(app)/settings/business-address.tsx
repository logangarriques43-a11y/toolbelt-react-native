/**
 * Business Address — port of BusinessAddressView.swift.
 * Address form saved to the business-settings store.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { KeyboardAwareForm } from '@/components/keyboard-aware-form';
import { ScreenHeader } from '@/components/screen-header';
import { useBusinessSettings } from '@/context/business-settings-store';
import type { BusinessAddress } from '@/models/business-settings';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function BusinessAddressScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const s = useBusinessSettings();
  const [addr, setAddr] = useState<BusinessAddress>(s.address);

  const field = (key: keyof BusinessAddress) => (v: string) => setAddr((a) => ({ ...a, [key]: v }));

  const save = () => {
    s.set('address', addr);
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Business Address" />
        <KeyboardAwareForm contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(iOSColors.red) }]}>
            <Icon name="mappin.circle.fill" size={30} color={iOSColors.red} />
          </View>

          <View style={styles.form}>
            <Field label="Street Address" placeholder="e.g. 123 Main St" value={addr.street} onChangeText={field('street')} />
            <Field label="Apt / Suite (optional)" placeholder="e.g. Suite 4B" value={addr.apt} onChangeText={field('apt')} />
            <Field label="City" placeholder="e.g. Los Angeles" value={addr.city} onChangeText={field('city')} />
            <View style={styles.rowFields}>
              <View style={styles.flex}><Field label="State" placeholder="e.g. CA" value={addr.state} onChangeText={field('state')} /></View>
              <View style={styles.flex}><Field label="ZIP Code" placeholder="e.g. 90001" value={addr.zip} onChangeText={field('zip')} keyboardType="number-pad" /></View>
            </View>
            <Field label="Country" placeholder="e.g. United States" value={addr.country} onChangeText={field('country')} />
          </View>

          <Pressable onPress={save} style={[styles.save, { backgroundColor: iOSColors.red }]}>
            <Text style={styles.saveText}>Save Address</Text>
          </Pressable>
        </KeyboardAwareForm>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Field({
  label, placeholder, value, onChangeText, keyboardType,
}: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void; keyboardType?: 'number-pad';
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.tertiaryText}
        keyboardType={keyboardType}
        style={[styles.input, { backgroundColor: theme.cardBackground, color: theme.primaryText, borderColor: theme.fieldBorder }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 24, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  form: { alignSelf: 'stretch', gap: 16 },
  rowFields: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '500' },
  input: { fontSize: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  save: { alignSelf: 'stretch', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
