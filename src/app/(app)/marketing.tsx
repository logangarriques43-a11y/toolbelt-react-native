/**
 * Marketing — port of MarketingDashboardView.swift. Coming-soon placeholder with
 * preview feature rows.
 */

import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { withOpacity } from '@/lib/color';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const FEATURES: { icon: SFSymbol; title: string; desc: string }[] = [
  { icon: 'envelope.fill', title: 'Email Campaigns', desc: 'Send targeted campaigns to your clients' },
  { icon: 'chart.line.uptrend.xyaxis', title: 'Social Media Analytics', desc: 'Track your social presence' },
  { icon: 'gift.fill', title: 'Promotions & Deals', desc: 'Create offers to attract new customers' },
  { icon: 'person.2.fill', title: 'Referral Program', desc: 'Reward clients who refer new business' },
];

export default function Marketing() {
  const theme = useAppTheme();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Marketing" />
        <View style={styles.body}>
          <Icon name="megaphone.fill" size={60} color={withOpacity(iOSColors.orange, 0.6)} />
          <Text style={[styles.title, { color: theme.primaryText }]}>Marketing</Text>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>
            Powerful marketing tools to help grow your business are coming soon.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={[styles.feature, { backgroundColor: theme.cardBackground }]}>
                <View style={[styles.featureIcon, { backgroundColor: withOpacity(iOSColors.orange, 0.1) }]}>
                  <Icon name={f.icon} size={20} color={iOSColors.orange} />
                </View>
                <View style={styles.featureText}>
                  <Text style={[styles.featureTitle, { color: theme.primaryText }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: theme.secondaryText }]}>{f.desc}</Text>
                </View>
                <Text style={[styles.soon, { color: iOSColors.orange, backgroundColor: withOpacity(iOSColors.orange, 0.1) }]}>Soon</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  sub: { fontSize: 16, textAlign: 'center', paddingHorizontal: 20 },
  features: { alignSelf: 'stretch', gap: 12, marginTop: 8 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureDesc: { fontSize: 13 },
  soon: { fontSize: 11, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
});
