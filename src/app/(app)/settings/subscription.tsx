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
import { ThemedIconTile } from '@/components/themed';
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
          <ThemedIconTile name="star.fill" size={72} filled />

          <Text style={theme.display(22)}>Everything included</Text>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>
            Your ToolBelt account includes all of the features below.
          </Text>

          <View style={[styles.card, theme.card]}>
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Icon name="checkmark.circle.fill" size={16} color={theme.accent} />
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
  sub: { fontSize: 14, textAlign: 'center' },
  card: { alignSelf: 'stretch', padding: 16, gap: 14, marginTop: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15 },
});
