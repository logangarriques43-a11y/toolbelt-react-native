/**
 * Payout setup — lightweight port of BusinessProfileIntroView.swift.
 * The intro/landing for getting paid (Stripe Connect). The full onboarding
 * (business profile, identity, bank linking) is a native/hosted Stripe Connect
 * flow and is stubbed per the project's webview-stub strategy.
 */

import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { ThemedButton } from '@/components/themed';
import { withOpacity } from '@/lib/color';
import { useAppTheme } from '@/theme/theme-context';

export default function Payout() {
  const theme = useAppTheme();
  const router = useRouter();

  const setUp = () =>
    Alert.alert(
      'Set Up Payouts',
      'Payout onboarding (Stripe Connect — business profile, identity verification, and bank linking) opens a secure hosted flow in the native build. Coming with native modules.',
    );

  return (
    <View style={[styles.root, { backgroundColor: theme.cardBackground }]}>
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: theme.hero, borderBottomWidth: 1, borderBottomColor: theme.divider }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroBar}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Icon name="xmark" size={16} color={withOpacity(theme.onHero, 0.85)} weight="medium" />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.heroCenter}>
          <View style={[styles.ring1, { backgroundColor: withOpacity(theme.onHero, 0.12) }]}>
            <View style={[styles.ring2, { backgroundColor: withOpacity(theme.onHero, 0.12) }]}>
              <Icon name="storefront.fill" size={48} color={theme.onHero} />
            </View>
          </View>
        </View>
      </View>

      {/* Content */}
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.contentInner}>
          <View style={styles.text}>
            <Text style={theme.display(28, '500')}>Get paid for your work</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Set up payouts to start accepting card payments and have your earnings deposited to your bank account.
            </Text>
            <View style={styles.timeRow}>
              <Icon name="clock" size={16} color={theme.secondaryText} />
              <Text style={[styles.timeText, { color: theme.secondaryText }]}>This should take 5–10 minutes.</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <ThemedButton title="Set Up Payouts" kind="accent" onPress={setUp} />
            <Pressable onPress={() => router.back()} style={styles.skip}>
              <Text style={[styles.skipText, { color: theme.secondaryText }]}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: '46%' },
  heroBar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  heroCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring1: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  ring2: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  text: { gap: 16 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  timeText: { fontSize: 15 },
  actions: { gap: 8 },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 15, fontWeight: '500' },
});
