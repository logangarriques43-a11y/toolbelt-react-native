/**
 * Plan & Features — a simple, informational "what's included" screen.
 *
 * There is NO in-app subscription at launch (matching the iOS app, which gates
 * nothing and has no functional subscription). This screen intentionally has no
 * price and no purchase/subscribe/restore/manage actions, so the app doesn't
 * advertise an in-app digital subscription. The real billing implementation was
 * shelved — see docs/SHELVED-SUBSCRIPTION.md to restore it later.
 */

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const FEATURES = [
  'Unlimited appointments',
  'Client management',
  'AI SMS assistant',
  'Online booking page',
  'Invoicing & payments',
  'Staff management',
  'Analytics & reports',
];

export default function Subscription() {
  const theme = useAppTheme();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Plan & Features" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(iOSColors.purple) }]}>
            <Icon name="star.fill" size={30} color={iOSColors.purple} />
          </View>

          <Text style={[styles.heading, { color: theme.primaryText }]}>Everything included</Text>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>
            Your ToolBelt account includes all of the features below.
          </Text>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon name="checkmark.circle.fill" size={16} color={iOSColors.green} />
                <Text style={[styles.featureText, { color: theme.primaryText }]}>{f}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 16, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 20, fontWeight: '700' },
  sub: { fontSize: 14, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 16, padding: 16, gap: 14, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15 },
});
