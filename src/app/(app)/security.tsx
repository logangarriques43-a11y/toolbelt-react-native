/**
 * Security / Two-Factor — lightweight port of TwoFactorMethodSelectionView.swift.
 * Lists the three 2FA methods (passkey / authenticator / phone) faithfully; the
 * actual setup flows (passkey registration, TOTP, SMS codes) are native + backend
 * and stubbed per the project's webview-stub strategy for onboarding.
 */

import type { SFSymbol } from 'expo-symbols';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { withOpacity } from '@/lib/color';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#6680F2';

type Badge = 'recommended' | 'leastSecure' | null;

const METHODS: { title: string; icon: SFSymbol; description: string; badge: Badge; note: string }[] = [
  { title: 'Add passkey', icon: 'person.badge.key.fill', description: 'Use Face ID or Touch ID', badge: 'recommended', note: 'Passkeys use the device Secure Enclave and need native biometric APIs — coming with the native build.' },
  { title: 'Add authenticator app', icon: 'apps.iphone', description: 'Use an app like Google Authenticator', badge: null, note: 'Authenticator (TOTP) enrollment is handled by the backend — coming with the native build.' },
  { title: 'Add phone number', icon: 'phone.fill', description: 'Receive codes via SMS', badge: 'leastSecure', note: 'SMS verification codes are sent by the backend (Twilio) — coming with the native build.' },
];

export default function Security() {
  const theme = useAppTheme();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Two-Factor Authentication" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.intro}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Set up your authentication method</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              We strongly encourage enabling multiple forms of two-step authentication as a backup in case you lose access.
            </Text>
          </View>

          {METHODS.map((m) => (
            <Pressable
              key={m.title}
              onPress={() => Alert.alert(m.title, m.note)}
              style={[styles.method, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
              <View style={[styles.methodIcon, { backgroundColor: withOpacity(BLUE, 0.1) }]}>
                <Icon name={m.icon} size={20} color={BLUE} />
              </View>
              <View style={styles.flex}>
                <View style={styles.methodTitleRow}>
                  <Text style={[styles.methodTitle, { color: theme.primaryText }]}>{m.title}</Text>
                  {m.badge === 'recommended' && (
                    <View style={[styles.badge, { backgroundColor: withOpacity(iOSColors.green, 0.1) }]}>
                      <Text style={[styles.badgeText, { color: '#33B36B' }]}>Recommended</Text>
                    </View>
                  )}
                  {m.badge === 'leastSecure' && (
                    <View style={[styles.badge, { backgroundColor: withOpacity(iOSColors.red, 0.1) }]}>
                      <Text style={[styles.badgeText, { color: withOpacity(iOSColors.red, 0.8) }]}>Least secure</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.methodDesc, { color: theme.secondaryText }]}>{m.description}</Text>
              </View>
              <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.6)} weight="medium" />
            </Pressable>
          ))}

          {/* Why it matters */}
          <View style={[styles.infoCard, { backgroundColor: withOpacity(BLUE, 0.08) }]}>
            <Icon name="shield.checkered" size={24} color={BLUE} />
            <View style={styles.flex}>
              <Text style={[styles.infoTitle, { color: theme.primaryText }]}>Why is this important?</Text>
              <Text style={[styles.infoText, { color: theme.secondaryText }]}>
                Two-step authentication adds an extra layer of security to protect your payment information.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 20, gap: 12, paddingBottom: 40 },
  intro: { gap: 12, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 21 },
  method: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 14 },
  methodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  methodTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodTitle: { fontSize: 16, fontWeight: '600' },
  methodDesc: { fontSize: 13, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '500' },
  infoCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 12, marginTop: 8 },
  infoTitle: { fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
});
