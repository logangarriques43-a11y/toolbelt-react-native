/**
 * Subscription & Plan — port of SubscriptionPlanView.swift.
 * Shows the current plan + features and links to App Store subscription management.
 */

import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
        <ScreenHeader title="Subscription & Plan" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.iconCircle, { backgroundColor: theme.iconBackground(iOSColors.purple) }]}>
            <Icon name="dollarsign.circle.fill" size={30} color={iOSColors.purple} />
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={styles.planRow}>
              <View style={[styles.planIcon, { backgroundColor: theme.iconBackground(iOSColors.purple) }]}>
                <Icon name="checkmark.seal.fill" size={16} color={iOSColors.purple} />
              </View>
              <View style={styles.planText}>
                <Text style={[styles.planTitle, { color: theme.primaryText }]}>ToolBelt Pro</Text>
                <Text style={[styles.planActive, { color: iOSColors.green }]}>Active plan</Text>
              </View>
              <Text style={[styles.planPrice, { color: theme.primaryText }]}>$15/mo</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.divider }]} />
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Icon name="checkmark.circle.fill" size={15} color={iOSColors.green} />
                  <Text style={[styles.featureText, { color: theme.primaryText }]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => WebBrowser.openBrowserAsync('https://apps.apple.com/account/subscriptions')}
            style={[styles.manage, { backgroundColor: iOSColors.purple }]}>
            <Icon name="arrow.up.right.square" size={16} color="#FFFFFF" />
            <Text style={styles.manageText}>Manage Subscription</Text>
          </Pressable>

          <Text style={[styles.note, { color: theme.secondaryText }]}>
            Subscriptions are managed through the App Store. Tap above to update, pause, or cancel your plan.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 24, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 16 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  planIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  planText: { flex: 1, gap: 2 },
  planTitle: { fontSize: 16, fontWeight: '600' },
  planActive: { fontSize: 13 },
  planPrice: { fontSize: 16, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  features: { padding: 16, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 15 },
  manage: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 14 },
  manageText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 13, textAlign: 'center', paddingHorizontal: 24 },
});
