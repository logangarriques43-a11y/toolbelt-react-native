/**
 * Payout Settings — port of the Swift Stripe Connect payout screens
 * (BusinessProfileIntroView + PayoutSettingsView).
 *
 * Reads GET /stripe/connect/account-status (and /payout-balance once an account
 * exists) and shows the account status (Approved / Needs info with what Stripe
 * still wants / Pending / Rejected), the payout bank, balances and the next
 * payout. With no account, "Set Up Payouts" creates one via
 * POST /stripe/connect/start-hosted-onboarding and opens Stripe's hosted
 * onboarding in an auth session (returns to toolbelt://stripe). An existing,
 * unapproved account continues with a fresh POST /create-account-link.
 *
 * Status is re-fetched whenever the browser closes, the app returns to the
 * foreground, or the user pulls to refresh. Once approved the session's
 * payoutComplete flag is set.
 */

import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createAccountLink,
  getAccountStatus,
  getPayoutBalance,
  isAccountApproved,
  startHostedOnboarding,
  type AccountStatus,
  type PayoutBalance,
} from '@/api/stripe';
import { Icon } from '@/components/icon';
import { ScreenHeader } from '@/components/screen-header';
import { LivePill, ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSession } from '@/context/session';
import { ApiError } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import { useAppTheme } from '@/theme/theme-context';

const RETURN_URL = 'toolbelt://stripe';

type StatusKind = 'approved' | 'needsInfo' | 'pending' | 'rejected';

const STATUS_COPY: Record<StatusKind, { title: string; icon: SFSymbol; body: string }> = {
  approved: {
    title: 'Approved',
    icon: 'checkmark.seal.fill',
    body: 'You can accept card payments, and payouts go to your bank automatically.',
  },
  needsInfo: {
    title: 'Needs info',
    icon: 'exclamationmark.triangle.fill',
    body: 'Stripe needs a few more details before you can take card payments and receive payouts.',
  },
  pending: {
    title: 'Pending',
    icon: 'hourglass',
    body: 'Stripe is reviewing your details. This usually takes a few minutes, occasionally a day or two.',
  },
  rejected: {
    title: 'Rejected',
    icon: 'xmark.circle.fill',
    body: "Stripe couldn't approve this account, so it can't take payments. Contact Stripe support for details.",
  },
};

function statusKind(s: AccountStatus): StatusKind {
  if (isAccountApproved(s)) return 'approved';
  if (s.accountStatus === 'rejected') return 'rejected';
  if (s.accountStatus === 'restricted' || (s.currentlyDue?.length ?? 0) > 0) return 'needsInfo';
  return 'pending';
}

/** "individual.verification.document" → "Individual verification document". */
function requirementLabel(req: string): string {
  const words = req.replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function money(cents: number): string {
  const [whole, frac] = (Math.abs(cents) / 100).toFixed(2).split('.');
  return `${cents < 0 ? '-' : ''}$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}

function arrivalLabel(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error && err.message ? err.message : 'Please check your connection and try again.';
}

export default function PayoutSettings() {
  const theme = useAppTheme();
  const router = useRouter();
  const session = useSession();

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [balance, setBalance] = useState<PayoutBalance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const s = await getAccountStatus();
      const b = s.hasAccount ? await getPayoutBalance().catch(() => null) : null;
      if (seq !== loadSeq.current) return;
      setStatus(s);
      setBalance(b);
      setLoadError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setLoadError(errorMessage(err));
    } finally {
      if (seq === loadSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Initial load + re-fetch whenever the app comes back to the foreground
  // (covers finishing onboarding in the browser and switching back by hand).
  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const approved = isAccountApproved(status);
  const { payoutComplete, completePayout } = session;
  useEffect(() => {
    if (approved && !payoutComplete) completePayout();
  }, [approved, payoutComplete, completePayout]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  /** Fetch a fresh Stripe link, open it, and re-check status once it closes. */
  const openStripe = async (getUrl: () => Promise<{ url: string }>) => {
    if (opening) return;
    setOpening(true);
    try {
      const { url } = await getUrl();
      await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
    } catch (err) {
      Alert.alert("Couldn't open Stripe", errorMessage(err));
    } finally {
      setOpening(false);
      load();
    }
  };

  const email = session.account?.email ?? auth.currentUser?.email ?? undefined;
  const setUp = () => openStripe(() => startHostedOnboarding({ email }));
  // Links expire in ~5 min, so each tap asks for a new one. If the account
  // vanished server-side, fall back to creating it again.
  const continueSetup = () =>
    openStripe(() =>
      createAccountLink().catch((err) => {
        if (err instanceof ApiError && err.code === 'NO_CONNECT_ACCOUNT') return startHostedOnboarding({ email });
        throw err;
      }),
    );

  let content: ReactNode;
  if (loading) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  } else if (loadError && !status) {
    content = (
      <View style={[styles.card, theme.card, styles.errorCard]}>
        <ThemedIconTile name="exclamationmark.triangle.fill" size={44} />
        <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Couldn't load payouts</Text>
        <Text style={[styles.body, styles.centerText, { color: theme.secondaryText }]}>{loadError}</Text>
        <ThemedButton title="Try Again" kind="quiet" onPress={refresh} style={styles.stretch} />
      </View>
    );
  } else if (!status?.hasAccount) {
    content = <Intro opening={opening} onSetUp={setUp} onSkip={() => router.back()} />;
  } else {
    const kind = statusKind(status);
    const copy = STATUS_COPY[kind];
    const due = status.currentlyDue ?? [];
    const reasons = (status.errors ?? []).map((e) => e.reason).filter(Boolean);
    content = (
      <>
        {/* Status */}
        <View style={[styles.card, theme.card, styles.gap12]}>
          <View style={styles.row}>
            <ThemedIconTile name={copy.icon} size={44} filled={kind === 'approved'} />
            <View style={styles.flex}>
              <Text style={[styles.caption, { color: theme.secondaryText }]}>Account status</Text>
              <Text style={theme.display(22, '500')}>{copy.title}</Text>
            </View>
            <LivePill live={kind === 'approved'} liveLabel="Active" offLabel={copy.title} />
          </View>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.body}</Text>

          {kind !== 'approved' && due.length > 0 && (
            <View style={[styles.dueBox, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.dueTitle, { color: theme.primaryText }]}>Stripe still needs</Text>
              {due.map((d) => (
                <View key={d} style={styles.dueRow}>
                  <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                  <Text style={[styles.dueText, { color: theme.secondaryText }]}>{requirementLabel(d)}</Text>
                </View>
              ))}
            </View>
          )}
          {kind !== 'approved' &&
            reasons.map((r) => (
              <Text key={r} style={[styles.small, { color: theme.secondaryText }]}>
                {r}
              </Text>
            ))}

          {kind !== 'rejected' && (
            <ThemedButton
              title={kind === 'needsInfo' ? 'Continue setup' : 'Update details'}
              kind={kind === 'needsInfo' ? 'accent' : 'quiet'}
              icon="arrow.up.right.square"
              loading={opening}
              onPress={continueSetup}
            />
          )}
        </View>

        {/* Bank */}
        <View style={[styles.card, theme.card, styles.row]}>
          <ThemedIconTile name="building.columns.fill" size={44} />
          <View style={styles.flex}>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Payout bank</Text>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
              {status.bankLast4 ? `${status.bankName ?? 'Bank account'} ••${status.bankLast4}` : 'No bank account yet'}
            </Text>
          </View>
        </View>

        {/* Balances */}
        {balance?.hasAccount && (
          <View style={[styles.card, theme.card, styles.gap12]}>
            <View style={styles.balanceRow}>
              <Stat label="Available" value={money(balance.available)} />
              <View style={[styles.vDivider, { backgroundColor: theme.divider }]} />
              <Stat label="Pending" value={money(balance.pending)} />
            </View>
            <View style={[styles.hDivider, { backgroundColor: theme.divider }]} />
            <View style={styles.row}>
              <ThemedIconTile name="calendar" size={36} />
              <View style={styles.flex}>
                <Text style={[styles.caption, { color: theme.secondaryText }]}>Next payout</Text>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>
                  {balance.nextPayout
                    ? `${money(balance.nextPayout.amount)} · arrives ${arrivalLabel(balance.nextPayout.arrivalDate)}`
                    : 'None scheduled'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.footNote}>
          <Icon name="lock.shield.fill" size={14} color={theme.tertiaryText} />
          <Text style={[styles.small, styles.flex, { color: theme.tertiaryText }]}>
            Payouts are handled by Stripe. Your bank and identity details are stored by Stripe, never on ToolBelt.
          </Text>
        </View>
      </>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScreenHeader title="Payout Settings" />
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.accent} />}>
          {content}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Intro({ opening, onSetUp, onSkip }: { opening: boolean; onSetUp: () => void; onSkip: () => void }) {
  const theme = useAppTheme();
  return (
    <View style={styles.intro}>
      <ThemedIconTile name="storefront.fill" size={88} filled style={styles.introIcon} />
      <Text style={[theme.display(28, '500'), styles.centerText]}>Get paid for your work</Text>
      <Text style={[styles.subtitle, styles.centerText, { color: theme.secondaryText }]}>
        Set up payouts to start accepting card payments and have your earnings deposited to your bank account.
      </Text>
      <View style={styles.timeRow}>
        <Icon name="clock" size={16} color={theme.secondaryText} />
        <Text style={[styles.body, { color: theme.secondaryText }]}>This should take 5–10 minutes.</Text>
      </View>
      <ThemedButton title="Set Up Payouts" kind="accent" loading={opening} onPress={onSetUp} style={styles.stretch} />
      <Pressable onPress={onSkip} style={styles.skip}>
        <Text style={[styles.skipText, { color: theme.secondaryText }]}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.caption, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={theme.display(24, '500')} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 16, paddingBottom: 40, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  centerText: { textAlign: 'center' },
  stretch: { alignSelf: 'stretch' },
  card: { padding: 16 },
  gap12: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  errorCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  caption: { fontSize: 13, fontWeight: '500' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 12, lineHeight: 17 },
  dueBox: { borderRadius: 10, padding: 12, gap: 8 },
  dueTitle: { fontSize: 14, fontWeight: '600' },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dueText: { fontSize: 14, flex: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, gap: 4, alignItems: 'center' },
  vDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  hDivider: { height: StyleSheet.hairlineWidth },
  footNote: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  intro: { alignItems: 'center', gap: 16, paddingHorizontal: 8, paddingTop: 24 },
  introIcon: { marginBottom: 8 },
  subtitle: { fontSize: 16, lineHeight: 22 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skip: { alignItems: 'center', paddingVertical: 8 },
  skipText: { fontSize: 15, fontWeight: '500' },
});
