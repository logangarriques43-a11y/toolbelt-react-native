/**
 * Custom Website — port of CustomWebsiteView.swift.
 * Marketing/info screen with a hero, "what's included" list, and a CTA.
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { withOpacity } from '@/lib/color';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const INCLUDED = [
  'Custom design matching your brand',
  'Mobile-responsive layout',
  'Integrated online booking',
  'Contact forms & maps',
  'SEO optimization',
  'Ongoing hosting & support',
];

export default function CustomWebsite() {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Custom Website" />
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.hero}>
            <View style={[styles.heroCircle, { backgroundColor: withOpacity(iOSColors.blue, 0.1) }]}>
              <Icon name="paintbrush.fill" size={44} color={iOSColors.blue} />
            </View>
            <Text style={[styles.heroTitle, { color: theme.primaryText }]}>Professional Website Design</Text>
            <Text style={[styles.heroSub, { color: theme.secondaryText }]}>
              We&apos;ll design and build a custom website for your business — mobile-friendly, fast, and connected to your ToolBelt booking system.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>What&apos;s Included</Text>
            {INCLUDED.map((t) => (
              <View key={t} style={styles.row}>
                <Icon name="checkmark.circle.fill" size={18} color={iOSColors.green} />
                <Text style={[styles.rowText, { color: theme.primaryText }]}>{t}</Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push('/request-quote')}
            style={styles.cta}>
            <Text style={styles.ctaText}>Request a Quote</Text>
          </Pressable>
          <Text style={[styles.note, { color: theme.secondaryText }]}>Our team will reach out within 24 hours</Text>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 32, paddingBottom: 40, alignItems: 'center' },
  hero: { alignItems: 'center', gap: 16, paddingTop: 8 },
  heroCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  heroSub: { fontSize: 16, textAlign: 'center', paddingHorizontal: 12, lineHeight: 22 },
  card: { alignSelf: 'stretch', padding: 20, borderRadius: 16, gap: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 16 },
  cta: { alignSelf: 'stretch', backgroundColor: iOSColors.blue, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  note: { fontSize: 14 },
});
