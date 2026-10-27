/**
 * Custom Website — port of CustomWebsiteView.swift.
 * Marketing/info screen with a hero, "what's included" list, and a CTA.
 *
 * "Request a Quote" opens the Request a Quote form (topic website_app), which
 * now really emails the team via POST /support/quote-request — before, that
 * send was simulated, so requests from this screen never reached anyone. The
 * secondary link points at the self-serve booking website (Online Booking),
 * the free builder owners can publish today while a custom site is quoted.
 */

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
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
            <ThemedIconTile name="paintbrush.fill" size={72} filled />
            <Text style={[styles.heroTitle, theme.display(26)]}>Professional Website Design</Text>
            <Text style={[styles.heroSub, { color: theme.secondaryText }]}>
              We&apos;ll design and build a custom website for your business — mobile-friendly, fast, and connected to your ToolBelt booking system.
            </Text>
          </View>

          <View style={[styles.card, theme.card]}>
            <Text style={theme.display(20, '500')}>What&apos;s Included</Text>
            {INCLUDED.map((t) => (
              <View key={t} style={styles.row}>
                <Icon name="checkmark.circle.fill" size={18} color={theme.accent} />
                <Text style={[styles.rowText, { color: theme.primaryText }]}>{t}</Text>
              </View>
            ))}
          </View>

          <ThemedButton
            title="Request a Quote"
            kind="inverse"
            onPress={() => router.push({ pathname: '/request-quote', params: { topic: 'website_app' } })}
            style={styles.cta}
          />
          <Text style={[styles.note, { color: theme.secondaryText }]}>Our team will reach out within 24 hours</Text>

          <Pressable onPress={() => router.push('/online-booking')} style={[styles.card, styles.selfServe, theme.card]}>
            <ThemedIconTile name="globe" size={40} />
            <View style={styles.selfServeText}>
              <Text style={[styles.selfServeTitle, { color: theme.primaryText }]}>Need a page today?</Text>
              <Text style={[styles.selfServeSub, { color: theme.secondaryText }]}>
                Create your free booking website in seconds with Online Booking.
              </Text>
            </View>
            <Icon name="chevron.right" size={14} color={theme.chevronTint} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 20, gap: 32, paddingBottom: 40, alignItems: 'center' },
  hero: { alignItems: 'center', gap: 16, paddingTop: 8 },
  heroTitle: { textAlign: 'center' },
  heroSub: { fontSize: 16, textAlign: 'center', paddingHorizontal: 12, lineHeight: 22 },
  card: { alignSelf: 'stretch', padding: 20, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { fontSize: 16 },
  cta: { alignSelf: 'stretch' },
  note: { fontSize: 14 },
  selfServe: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  selfServeText: { flex: 1, gap: 2 },
  selfServeTitle: { fontSize: 15, fontWeight: '600' },
  selfServeSub: { fontSize: 13, lineHeight: 18 },
});
