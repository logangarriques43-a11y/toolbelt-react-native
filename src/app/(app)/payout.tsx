/**
 * Payout setup — lightweight port of BusinessProfileIntroView.swift.
 * The intro/landing for getting paid (Stripe Connect). The full onboarding
 * (business profile, identity, bank linking) is a native/hosted Stripe Connect
 * flow and is stubbed per the project's webview-stub strategy.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { useAppTheme } from '@/theme/theme-context';

const GRADIENT = ['#6680F2', '#8073EB', '#9966E6'] as const;

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
      {/* Gradient hero */}
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroBar}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Icon name="xmark" size={16} color="rgba(255,255,255,0.85)" weight="medium" />
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={styles.heroCenter}>
          <View style={styles.ring1}>
            <View style={styles.ring2}>
              <Icon name="storefront.fill" size={48} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <SafeAreaView style={styles.content} edges={['bottom']}>
        <View style={styles.contentInner}>
          <View style={styles.text}>
            <Text style={[styles.title, { color: theme.primaryText }]}>Get paid for your work</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Set up payouts to start accepting card payments and have your earnings deposited to your bank account.
            </Text>
            <View style={styles.timeRow}>
              <Icon name="clock" size={16} color={theme.secondaryText} />
              <Text style={[styles.timeText, { color: theme.secondaryText }]}>This should take 5–10 minutes.</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={setUp}>
              <LinearGradient colors={['#6680F2', '#9966E6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
                <Text style={styles.ctaText}>Set Up Payouts</Text>
              </LinearGradient>
            </Pressable>
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
  ring1: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  ring2: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  contentInner: { flex: 1, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24, justifyContent: 'space-between' },
  text: { gap: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, lineHeight: 22 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  timeText: { fontSize: 15 },
  actions: { gap: 8 },
  cta: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '600' },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 15, fontWeight: '500' },
});
