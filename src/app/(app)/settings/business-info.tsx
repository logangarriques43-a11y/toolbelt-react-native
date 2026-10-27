/**
 * Business Name & Info — port of BusinessNameInfoView.swift.
 * Edits the account (business name, owner name, email, phone) via the session.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsFormField } from '@/components/settings-form-field';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';

export default function BusinessInfo() {
  const router = useRouter();
  const { account, updateAccount } = useSession();

  const [businessName, setBusinessName] = useState(account?.businessName ?? '');
  const [ownerName, setOwnerName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [phone, setPhone] = useState(account?.phoneNumber ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();

  const save = () => {
    if (email && !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(undefined);
    updateAccount({
      name: ownerName.trim(),
      businessName: businessName.trim() || undefined,
      email: email.trim() || undefined,
      phoneNumber: phone.trim() || undefined,
    });
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Business Name & Info" />
        <ScrollView contentContainerStyle={styles.body}>
          <ThemedIconTile name="building.2.fill" size={72} filled />
          <View style={styles.form}>
            <SettingsFormField label="Business Name" placeholder="e.g. Glamour Studio" value={businessName} onChangeText={setBusinessName} autoCapitalize="words" />
            <SettingsFormField label="Owner / Contact Name" placeholder="e.g. Jane Smith" value={ownerName} onChangeText={setOwnerName} autoCapitalize="words" />
            <SettingsFormField label="Email Address" placeholder="e.g. jane@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={emailError} />
            <SettingsFormField label="Phone Number" placeholder="e.g. (555) 123-4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <ThemedButton title="Save Changes" onPress={save} style={styles.save} />
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 24, alignItems: 'center', paddingBottom: 40 },
  form: { alignSelf: 'stretch', gap: 16 },
  save: { alignSelf: 'stretch' },
});
