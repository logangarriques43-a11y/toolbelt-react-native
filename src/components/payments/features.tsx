/**
 * Payment Features / More — port of PaymentTabViews.swift (Features + More tabs).
 * Features: the 4-category catalog with per-feature Active badges driven by the
 * feature-setup store; tapping a row opens a generic detail sheet that toggles
 * enablement. Each feature's bespoke setup flow (gift cards, reminders, promos, …)
 * is deferred — the sheet notes that. More: a settings list wired to existing
 * routes; Payment Settings / Bank Accounts open Payout Settings (/payout).
 */

import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { LivePill, ThemedButton, ThemedIconTile } from '@/components/themed';
import { useFeatureSetup } from '@/context/feature-setup-store';
import { withOpacity } from '@/lib/color';
import { FEATURE_CATEGORIES, type PaymentFeature } from '@/models/payment-feature';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BASE = 'https://toolbelt-backend-dtvy.onrender.com';

// ── Features grid ─────────────────────────────────────────────────────

export function PaymentFeatures() {
  const theme = useAppTheme();
  const setup = useFeatureSetup();
  const [selected, setSelected] = useState<PaymentFeature | null>(null);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.featuresBody}>
        <Text style={[styles.caption, { color: theme.secondaryText }]}>Payment Features</Text>
        {FEATURE_CATEGORIES.map((category) => (
          <View key={category.title} style={[styles.categoryCard, theme.card]}>
            <View style={styles.categoryHead}>
              <Icon name={category.icon} size={15} color={theme.accent} weight="semibold" />
              <Text style={[styles.categoryTitle, { color: theme.primaryText }]}>{category.title}</Text>
            </View>
            {category.features.map((feature, i) => (
              <View key={feature.id}>
                <Pressable style={styles.featureRow} onPress={() => setSelected(feature)}>
                  <ThemedIconTile name={feature.icon} size={44} />
                  <View style={styles.flex}>
                    <Text style={[styles.featureName, { color: theme.primaryText }]}>{feature.name}</Text>
                    <Text style={[styles.featureDesc, { color: theme.secondaryText }]} numberOfLines={2}>
                      {feature.description}
                    </Text>
                  </View>
                  {setup.isEnabled(feature.id) ? (
                    <LivePill live liveLabel="Active" />
                  ) : (
                    <Icon name="chevron.right" size={13} color={theme.tertiaryText} weight="medium" />
                  )}
                </Pressable>
                {i < category.features.length - 1 && <View style={[styles.rowDivider, { marginLeft: 74, backgroundColor: theme.divider }]} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <FeatureDetailSheet
        feature={selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function FeatureDetailSheet({
  feature,
  onClose,
}: {
  feature: PaymentFeature | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const setup = useFeatureSetup();
  const enabled = feature ? setup.isEnabled(feature.id) : false;

  return (
    <Modal visible={feature != null} animationType="slide" onRequestClose={onClose}>
      <DashboardGradient>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <View style={[styles.sheetHeader, { backgroundColor: theme.cardBackground }]}>
            <Pressable onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.cardBackground, borderWidth: 1, borderColor: theme.divider }]}>
              <Icon name="xmark" size={16} color={theme.secondaryText} weight="medium" />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.primaryText }]} numberOfLines={1}>
              {feature?.name ?? ''}
            </Text>
            <View style={styles.roundBtn} />
          </View>

          {feature && (
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <ThemedIconTile name={feature.icon} size={72} filled style={styles.heroIcon} />
              <Text style={[theme.display(22, '500'), styles.heroName]}>{feature.name}</Text>
              <Text style={[styles.heroDesc, { color: theme.secondaryText }]}>{feature.description}</Text>

              <LivePill live={enabled} liveLabel="Active" offLabel="Not set up" />

              {enabled ? (
                <Pressable onPress={() => setup.toggle(feature.id)} style={styles.toggleWrap}>
                  <View style={[styles.toggleBtn, { backgroundColor: withOpacity(iOSColors.red, 0.1), borderRadius: theme.isEditorial ? 2 : 999 }]}>
                    <Text style={[styles.toggleText, { color: iOSColors.red }]}>Disable Feature</Text>
                  </View>
                </Pressable>
              ) : (
                <ThemedButton title="Enable Feature" kind="accent" onPress={() => setup.toggle(feature.id)} style={styles.toggleWrap} />
              )}

              <View style={[styles.note, { backgroundColor: theme.inputBackground }]}>
                <Icon name="info.circle.fill" size={14} color={theme.accent} />
                <Text style={[styles.noteText, { color: theme.secondaryText }]}>
                  Detailed setup for this feature is coming soon.
                </Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </DashboardGradient>
    </Modal>
  );
}

// ── More tab ──────────────────────────────────────────────────────────

export function PaymentMore() {
  const theme = useAppTheme();
  const router = useRouter();


  const rows: { icon: SFSymbol; title: string; onPress: () => void; divider: boolean }[] = [
    { icon: 'gearshape.fill', title: 'Payment Settings', divider: true, onPress: () => router.push('/payout') },
    { icon: 'building.columns.fill', title: 'Bank Accounts', divider: true, onPress: () => router.push('/payout') },
    { icon: 'doc.text.fill', title: 'Tax Documents', divider: true, onPress: () => router.push('/accounting/tax') },
    { icon: 'shield.checkered', title: 'Fraud Protection', divider: true, onPress: () => Alert.alert('Fraud Protection', 'Stripe screens every card payment for fraud automatically.') },
    { icon: 'questionmark.circle.fill', title: 'Help & Support', divider: true, onPress: () => router.push('/help') },
    { icon: 'doc.plaintext.fill', title: 'Terms of Service', divider: false, onPress: () => WebBrowser.openBrowserAsync(`${BASE}/terms`) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.moreBody}>
      <View style={[styles.moreCard, theme.card]}>
        {rows.map((r) => (
          <View key={r.title}>
            <Pressable style={styles.moreRow} onPress={r.onPress}>
              <ThemedIconTile name={r.icon} size={36} />
              <Text style={[styles.moreTitle, { color: theme.primaryText }]}>{r.title}</Text>
              <View style={styles.flex} />
              <Icon name="chevron.right" size={14} color={theme.tertiaryText} weight="medium" />
            </Pressable>
            {r.divider && <View style={[styles.rowDivider, { marginLeft: 66, backgroundColor: theme.divider }]} />}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Features
  featuresBody: { paddingBottom: 20, gap: 20, paddingTop: 16 },
  caption: { fontSize: 15, fontWeight: '500', paddingHorizontal: 20 },
  categoryCard: { marginHorizontal: 16, overflow: 'hidden' },
  categoryHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  categoryTitle: { fontSize: 17, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  featureName: { fontSize: 15, fontWeight: '600' },
  featureDesc: { fontSize: 12, marginTop: 3 },
  rowDivider: { height: StyleSheet.hairlineWidth },
  // Detail sheet
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { alignItems: 'center', padding: 24, gap: 16 },
  heroIcon: { marginTop: 12 },
  heroName: { textAlign: 'center' },
  heroDesc: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  toggleWrap: { alignSelf: 'stretch', marginTop: 8 },
  toggleBtn: { alignItems: 'center', paddingVertical: 16 },
  toggleText: { fontSize: 16, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, alignSelf: 'stretch' },
  noteText: { fontSize: 12, flex: 1 },
  // More
  moreBody: { padding: 16, paddingTop: 24 },
  moreCard: { overflow: 'hidden' },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  moreTitle: { fontSize: 16, fontWeight: '500' },
});
