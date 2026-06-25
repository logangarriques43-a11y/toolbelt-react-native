/**
 * Edit Profile — port of EditProfileView.swift.
 * Edits the account (name, email, phone) via the session.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { ScreenHeader } from '@/components/screen-header';
import { SettingsFormField } from '@/components/settings-form-field';
import { useSession } from '@/context/session';
import { clientInitials } from '@/models/client';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export default function EditProfile() {
  const theme = useAppTheme();
  const router = useRouter();
  const { account, updateAccount } = useSession();

  const [name, setName] = useState(account?.name ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [phone, setPhone] = useState(account?.phoneNumber ?? '');
  const [emailError, setEmailError] = useState<string | undefined>();

  const save = () => {
    if (email && !email.includes('@')) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(undefined);
    updateAccount({ name: name.trim(), email: email.trim() || undefined, phoneNumber: phone.trim() || undefined });
    router.back();
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Edit Profile" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.avatar, { backgroundColor: theme.iconBackground(iOSColors.blue) }]}>
            <Text style={[styles.avatarText, { color: iOSColors.blue }]}>{clientInitials(name || '?')}</Text>
          </View>
          <View style={styles.form}>
            <SettingsFormField label="Full Name" placeholder="e.g. Jane Smith" value={name} onChangeText={setName} autoCapitalize="words" />
            <SettingsFormField label="Email Address" placeholder="e.g. jane@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" error={emailError} />
            <SettingsFormField label="Phone Number" placeholder="e.g. (555) 123-4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
          <Pressable onPress={save} style={[styles.save, { backgroundColor: iOSColors.blue }]}>
            <Text style={styles.saveText}>Save Changes</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 24, alignItems: 'center', paddingBottom: 40 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '700' },
  form: { alignSelf: 'stretch', gap: 16 },
  save: { alignSelf: 'stretch', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
