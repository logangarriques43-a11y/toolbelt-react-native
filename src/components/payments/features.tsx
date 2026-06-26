/**
 * Payment Features / More — port of PaymentTabViews.swift (Features + More tabs).
 * Features: the 4-category catalog with per-feature Active badges driven by the
 * feature-setup store; tapping a row opens a generic detail sheet that toggles
 * enablement. Each feature's bespoke setup flow (gift cards, reminders, promos, …)
 * is deferred — the sheet notes that. More: a settings list wired to existing
 * routes; payout/bank rows point at the Phase-7 payout flow.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { useFeatureSetup } from '@/context/feature-setup-store';
import { withOpacity } from '@/lib/color';
import { FEATURE_CATEGORIES, type PaymentFeature } from '@/models/payment-feature';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const GREEN = '#33C773';
const BASE = 'https://toolbelt-backend-dtvy.onrender.com';

// ── Features grid ─────────────────────────────────────────────────────

export function PaymentFeatures() {
  const theme = useAppTheme();
  const setup = useFeatureSetup();
  const [selected, setSelected] = useState<{ feature: PaymentFeature; color: string } | null>(null);

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.featuresBody}>
        <Text style={[styles.caption, { color: theme.secondaryText }]}>Payment Features</Text>
        {FEATURE_CATEGORIES.map((category) => (
          <View key={category.title} style={[styles.categoryCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={styles.categoryHead}>
              <Icon name={category.icon} size={15} color={category.color} weight="semibold" />
              <Text style={[styles.categoryTitle, { color: theme.primaryText }]}>{category.title}</Text>
            </View>
            {category.features.map((feature, i) => (
              <View key={feature.id}>
                <Pressable style={styles.featureRow} onPress={() => setSelected({ feature, color: category.color })}>
                  <View style={[styles.featureIcon, { backgroundColor: withOpacity(category.color, 0.1) }]}>
                    <Icon name={feature.icon} size={18} color={category.color} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.featureName, { color: theme.primaryText }]}>{feature.name}</Text>
                    <Text style={[styles.featureDesc, { color: theme.secondaryText }]} numberOfLines={2}>
                      {feature.description}
                    </Text>
                  </View>
                  {setup.isEnabled(feature.id) ? (
                    <View style={[styles.activeBadge, { backgroundColor: withOpacity(GREEN, 0.1) }]}>
                      <Text style={[styles.activeText, { color: GREEN }]}>Active</Text>
                    </View>
                  ) : (
                    <Icon name="chevron.right" size={13} color={withOpacity(iOSColors.gray, 0.4)} weight="medium" />
                  )}
                </Pressable>
                {i < category.features.length - 1 && <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <FeatureDetailSheet
        feature={selected?.feature ?? null}
        color={selected?.color ?? GREEN}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function FeatureDetailSheet({
  feature,
  color,
  onClose,
}: {
  feature: PaymentFeature | null;
  color: string;
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
            <Pressable onPress={onClose} style={[styles.roundBtn, { backgroundColor: theme.cardBackground }]}>
              <Icon name="xmark" size={16} color={theme.secondaryText} weight="medium" />
            </Pressable>
            <Text style={[styles.sheetTitle, { color: theme.primaryText }]} numberOfLines={1}>
              {feature?.name ?? ''}
            </Text>
            <View style={styles.roundBtn} />
          </View>

          {feature && (
            <ScrollView contentContainerStyle={styles.sheetBody}>
              <View style={[styles.heroIcon, { backgroundColor: withOpacity(color, 0.12) }]}>
                <Icon name={feature.icon} size={44} color={color} />
              </View>
              <Text style={[styles.heroName, { color: theme.primaryText }]}>{feature.name}</Text>
              <Text style={[styles.heroDesc, { color: theme.secondaryText }]}>{feature.description}</Text>

              <View style={[styles.statusPill, { backgroundColor: withOpacity(enabled ? GREEN : iOSColors.gray, 0.12) }]}>
                <Icon
                  name={enabled ? 'checkmark.circle.fill' : 'circle'}
                  size={14}
                  color={enabled ? GREEN : iOSColors.gray}
                />
                <Text style={[styles.statusText, { color: enabled ? GREEN : iOSColors.gray }]}>
                  {enabled ? 'Active' : 'Not set up'}
                </Text>
              </View>

              <Pressable onPress={() => setup.toggle(feature.id)} style={styles.toggleWrap}>
                {enabled ? (
                  <View style={[styles.toggleBtn, { backgroundColor: withOpacity(iOSColors.red, 0.1) }]}>
                    <Text style={[styles.toggleText, { color: iOSColors.red }]}>Disable Feature</Text>
                  </View>
                ) : (
                  <LinearGradient colors={[color, withOpacity(color, 0.8)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toggleBtn}>
                    <Text style={[styles.toggleText, { color: '#FFFFFF' }]}>Enable Feature</Text>
                  </LinearGradient>
                )}
              </Pressable>

              <View style={[styles.note, { backgroundColor: withOpacity(iOSColors.blue, 0.06) }]}>
                <Icon name="info.circle.fill" size={14} color={withOpacity(iOSColors.blue, 0.7)} />
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

  const soon = (title: string, msg: string) => Alert.alert(title, msg);

  const rows: { icon: SFSymbol; title: string; color: string; onPress: () => void; divider: boolean }[] = [
    { icon: 'gearshape.fill', title: 'Payment Settings', color: iOSColors.gray, divider: true, onPress: () => soon('Payment Settings', 'Payout & payment settings arrive with native onboarding (Phase 7).') },
    { icon: 'building.columns.fill', title: 'Bank Accounts', color: '#339966', divider: true, onPress: () => soon('Bank Accounts', 'Bank account setup arrives with native onboarding (Phase 7).') },
    { icon: 'doc.text.fill', title: 'Tax Documents', color: '#CC9933', divider: true, onPress: () => router.push('/accounting/tax') },
    { icon: 'shield.checkered', title: 'Fraud Protection', color: '#E64D4D', divider: true, onPress: () => soon('Fraud Protection', 'Coming soon.') },
    { icon: 'questionmark.circle.fill', title: 'Help & Support', color: iOSColors.blue, divider: true, onPress: () => router.push('/help') },
    { icon: 'doc.plaintext.fill', title: 'Terms of Service', color: iOSColors.gray, divider: false, onPress: () => WebBrowser.openBrowserAsync(`${BASE}/terms`) },
  ];

  return (
    <ScrollView contentContainerStyle={styles.moreBody}>
      <View style={[styles.moreCard, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
        {rows.map((r) => (
          <View key={r.title}>
            <Pressable style={styles.moreRow} onPress={r.onPress}>
              <View style={[styles.moreIcon, { backgroundColor: withOpacity(r.color, 0.1) }]}>
                <Icon name={r.icon} size={20} color={r.color} />
              </View>
              <Text style={[styles.moreTitle, { color: theme.primaryText }]}>{r.title}</Text>
              <View style={styles.flex} />
              <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} weight="medium" />
            </Pressable>
            {r.divider && <View style={[styles.rowDivider, { backgroundColor: theme.divider }]} />}
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
  categoryCard: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
  categoryHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  categoryTitle: { fontSize: 17, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 },
  featureIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureName: { fontSize: 15, fontWeight: '600' },
  featureDesc: { fontSize: 12, marginTop: 3 },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activeText: { fontSize: 11, fontWeight: '500' },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 70 },
  // Detail sheet
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  sheetTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' },
  roundBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { alignItems: 'center', padding: 24, gap: 16 },
  heroIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  heroName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  heroDesc: { fontSize: 15, textAlign: 'center', lineHeight: 21 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statusText: { fontSize: 13, fontWeight: '600' },
  toggleWrap: { alignSelf: 'stretch', marginTop: 8 },
  toggleBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: 14 },
  toggleText: { fontSize: 16, fontWeight: '600' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, alignSelf: 'stretch' },
  noteText: { fontSize: 12, flex: 1 },
  // More
  moreBody: { padding: 16, paddingTop: 24 },
  moreCard: { borderRadius: 16, overflow: 'hidden' },
  moreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  moreIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moreTitle: { fontSize: 16, fontWeight: '500' },
});
