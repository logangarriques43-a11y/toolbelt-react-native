/**
 * Subscription & Plan — ToolBelt Pro ($15/mo) via Google Play Billing
 * (react-native-iap, verified in-house). State-driven: subscribe when not a
 * member, or show the active plan with a Play-store manage/cancel link; Restore
 * Purchases in both cases. Entitlement comes from the backend (useSubscription),
 * not hardcoded.
 */

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { useSubscription } from '@/context/subscription';
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

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const fmtDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '');

export default function Subscription() {
  const theme = useAppTheme();
  const sub = useSubscription();
  const [restoring, setRestoring] = useState(false);

  const onSubscribe = async () => {
    const result = await sub.purchase();
    if (result.status === 'purchased') Alert.alert('Welcome to ToolBelt Pro', 'Your subscription is now active.');
    else if (result.status === 'unavailable') Alert.alert('Not available here', 'Subscriptions are only available in the installed ToolBelt app.');
    else if (result.status === 'error') Alert.alert("Couldn't complete purchase", result.message);
    // 'cancelled' → no alert
  };

  const onRestore = async () => {
    setRestoring(true);
    const result = await sub.restore();
    setRestoring(false);
    if (result.status === 'purchased') Alert.alert('Subscription restored', 'ToolBelt Pro is active on this account.');
    else if (result.status === 'unavailable') Alert.alert('Not available here', 'Restore is only available in the installed ToolBelt app.');
    else if (result.status === 'error') Alert.alert('Nothing to restore', result.message);
  };

  const onManage = () => sub.openManage();

  const statusLine = sub.willRenew
    ? `Renews ${fmtDate(sub.expirationDate)}`
    : `Access until ${fmtDate(sub.expirationDate)} (won't renew)`;

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
                <Text style={[styles.planStatus, { color: sub.isPro ? iOSColors.green : theme.secondaryText }]}>
                  {sub.isLoading ? 'Checking…' : sub.isPro ? statusLine : 'Not subscribed'}
                </Text>
              </View>
              <Text style={[styles.planPrice, { color: theme.primaryText }]}>{sub.priceString}/mo</Text>
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

          {/* Primary action: subscribe (non-members) or manage (members) */}
          {sub.isLoading ? (
            <ActivityIndicator color={iOSColors.purple} />
          ) : sub.isPro ? (
            <Pressable onPress={onManage} style={[styles.primaryBtn, { backgroundColor: iOSColors.purple }]}>
              <Icon name="arrow.up.right.square" size={16} color="#FFFFFF" />
              <Text style={styles.primaryBtnText}>Manage Subscription</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onSubscribe}
              disabled={sub.purchasing || !sub.available}
              style={[styles.primaryBtn, { backgroundColor: sub.available ? iOSColors.purple : iOSColors.gray }]}>
              {sub.purchasing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="star.fill" size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Subscribe — {sub.priceString}/mo</Text>
                </>
              )}
            </Pressable>
          )}

          {/* Restore is required by Play and useful after reinstall / new device */}
          {sub.available && !sub.isLoading && (
            <Pressable onPress={onRestore} disabled={restoring} hitSlop={8}>
              <Text style={[styles.restore, { color: iOSColors.blue }]}>
                {restoring ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </Pressable>
          )}

          <Text style={[styles.note, { color: theme.secondaryText }]}>
            {sub.isPro
              ? 'Manage or cancel anytime in Google Play › Subscriptions. Cancelling keeps your access until the end of the current period.'
              : sub.available
                ? 'Billed monthly through Google Play. Cancel anytime in Google Play › Subscriptions.'
                : 'Subscriptions are available in the installed ToolBelt app (not in Expo Go).'}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { padding: 16, gap: 20, alignItems: 'center', paddingBottom: 40 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 16 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  planIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  planText: { flex: 1, gap: 2 },
  planTitle: { fontSize: 16, fontWeight: '600' },
  planStatus: { fontSize: 13 },
  planPrice: { fontSize: 16, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  features: { padding: 16, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 15 },
  primaryBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 12 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  restore: { fontSize: 15, fontWeight: '500', paddingVertical: 4 },
  note: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
