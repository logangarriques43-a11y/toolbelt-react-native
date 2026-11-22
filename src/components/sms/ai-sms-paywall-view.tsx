/**
 * AiSmsPaywallView — the AI Texting plan picker's look, shared by the Google
 * Play paywall (`ai-sms-paywall.tsx`, RevenueCat) and the browser paywall
 * (`ai-sms-paywall.web.tsx`, Stripe). Purely presentational: the container
 * loads the plans, tracks the selection and runs the purchase.
 *
 * `plans === null` shows the loading state; an empty list shows the
 * "couldn't load plans" state, so a purchasable paywall never appears without
 * real prices.
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export interface PaywallPlanOption {
  id: string;
  name: string;
  /** Display price, e.g. "$20.00". */
  priceString: string;
}

export function AiSmsPaywallView({
  plans,
  selected,
  onSelect,
  onSubscribe,
  purchasing,
  ctaTitle,
  finePrint,
  highlight,
}: {
  plans: PaywallPlanOption[] | null;
  selected: string | null;
  onSelect: (id: string) => void;
  onSubscribe: () => void;
  purchasing: boolean;
  ctaTitle: string;
  finePrint: string;
  /** Optional callout above the plans, e.g. a free-trial offer. */
  highlight?: string;
}) {
  const theme = useAppTheme();
  const router = useRouter();
  const loading = plans === null;
  const unavailable = plans !== null && plans.length === 0;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={theme.accent} weight="semibold" />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>AI Texting</Text>
          <View style={styles.back} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.center}>
            <ThemedIconTile name="bubble.left.and.text.bubble.right.fill" size={72} filled style={styles.hero} />
            <Text style={[styles.title, theme.display(24)]}>Unlock AI Texting</Text>
            <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
              Includes your own business number, AI-handled bookings, and unlimited conversations.
            </Text>

            <View style={[styles.featureCard, theme.card]}>
              <Feature icon="phone.fill" title="Your Own Business Number" subtitle="Clients text this number to book" />
              <Divider />
              <Feature icon="brain" title="AI Handles Conversations" subtitle="Books, reschedules, and cancels automatically" />
              <Divider />
              <Feature icon="calendar.badge.plus" title="Auto-Adds to Calendar" subtitle="Appointments appear in your schedule" />
              <Divider />
              <Feature icon="eye.fill" title="You See Everything" subtitle="View all conversations and take over anytime" />
            </View>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Loading plans…</Text>
              </View>
            ) : unavailable ? (
              <View style={[styles.unavailableCard, theme.card]}>
                <Icon name="exclamationmark.triangle.fill" size={22} color={iOSColors.orange} />
                <Text style={[styles.unavailableText, { color: theme.secondaryText }]}>
                  We couldn&apos;t load plans right now. Please try again in a moment.
                </Text>
              </View>
            ) : (
              <>
                {highlight ? (
                  <View style={[styles.highlight, { backgroundColor: theme.accentSoft, borderRadius: theme.cornerRadius }]}>
                    <Icon name="gift.fill" size={18} color={theme.accent} />
                    <Text style={[styles.highlightText, { color: theme.primaryText }]}>{highlight}</Text>
                  </View>
                ) : null}
                <Text style={[styles.choose, { color: theme.primaryText }]}>Choose your plan</Text>
                {plans!.map((p) => {
                  const active = selected === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => onSelect(p.id)}
                      style={[
                        styles.planCard,
                        {
                          backgroundColor: active ? theme.accentSoft : theme.cardBackground,
                          borderColor: active ? theme.accent : theme.divider,
                          borderRadius: theme.cornerRadius,
                        },
                      ]}>
                      <View style={[styles.radio, { borderColor: active ? theme.accent : theme.tertiaryText }]}>
                        {active ? <View style={[styles.radioDot, { backgroundColor: theme.accent }]} /> : null}
                      </View>
                      <Text style={[styles.planName, { color: theme.primaryText }]}>{p.name}</Text>
                      <Text style={[styles.planPrice, { color: theme.primaryText }]}>
                        {p.priceString}
                        <Text style={[styles.planPer, { color: theme.secondaryText }]}>/mo</Text>
                      </Text>
                    </Pressable>
                  );
                })}

                <ThemedButton title={ctaTitle} onPress={onSubscribe} loading={purchasing} disabled={!selected} style={styles.cta} />
                <Text style={[styles.fine, { color: theme.secondaryText }]}>
                  {finePrint}
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Feature({ icon, title, subtitle }: { icon: SFSymbol; title: string; subtitle: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.feature}>
      <ThemedIconTile name={icon} size={36} />
      <View style={styles.flex}>
        <Text style={[styles.featureTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.featureSub, { color: theme.secondaryText }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Divider() {
  const theme = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.divider }]} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  center: { alignItems: 'center', gap: 16 },
  hero: { marginTop: 8 },
  title: { textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  featureCard: { alignSelf: 'stretch', paddingHorizontal: 16 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureSub: { fontSize: 13, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 50 },
  loadingBox: { alignItems: 'center', gap: 10, paddingVertical: 24 },
  unavailableCard: { alignSelf: 'stretch', padding: 16, alignItems: 'center', gap: 10 },
  unavailableText: { fontSize: 14, textAlign: 'center', lineHeight: 19 },
  choose: { alignSelf: 'flex-start', fontSize: 16, fontWeight: '700', marginTop: 4 },
  planCard: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 11, height: 11, borderRadius: 6 },
  planName: { flex: 1, fontSize: 16, fontWeight: '600' },
  planPrice: { fontSize: 17, fontWeight: '700' },
  planPer: { fontSize: 13, fontWeight: '500' },
  cta: { alignSelf: 'stretch', marginTop: 8 },
  highlight: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  highlightText: { flex: 1, fontSize: 15, fontWeight: '600' },
  fine: { fontSize: 12, textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
});
