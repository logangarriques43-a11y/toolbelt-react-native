/**
 * AI Conversations — port of SMSConversationsView.swift.
 * Status-filtered list of AI SMS conversations from the backend. Tap a row to
 * open the thread; the gear opens the phone-number setup. A paid plan without a
 * number yet points at setup, which provisions it.
 *
 * Threads that need the owner (escalated to a human, customer waiting) carry a
 * "Needs you" badge and sort first; a banner above the filters jumps to them.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiSmsPaywall } from '@/components/sms/ai-sms-paywall';
import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { ThemedButton, ThemedIconTile } from '@/components/themed';
import { useSMS } from '@/context/sms-store';
import { useAiSmsEntitlement } from '@/hooks/use-ai-sms-entitlement';
import { withOpacity } from '@/lib/color';
import {
  conversationDisplayName,
  smsStatusIcon,
  smsTimeAgo,
  type SMSConversation,
  type SMSStatus,
} from '@/models/sms';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const FILTERS: { key: SMSStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'completed', label: 'Completed' },
];

export default function SMSConversations() {
  const theme = useAppTheme();
  const router = useRouter();
  const sms = useSMS();
  const { entitled, loading: entLoading } = useAiSmsEntitlement();
  const [filter, setFilter] = useState<SMSStatus>('active');
  const [refreshing, setRefreshing] = useState(false);

  // "Needs you" threads first; otherwise keep the server's order (newest first).
  const list = useMemo(() => {
    const inFilter = sms.conversations.filter((c) => c.status === filter);
    return [...inFilter.filter((c) => c.needsAttention), ...inFilter.filter((c) => !c.needsAttention)];
  }, [sms.conversations, filter]);
  const needsYou = useMemo(() => sms.conversations.filter((c) => c.needsAttention), [sms.conversations]);
  // Where the waiting threads live; escalated in practice, but don't assume.
  const needsYouFilter: SMSStatus = needsYou.every((c) => c.status === 'escalated') ? 'escalated' : needsYou[0]?.status ?? 'escalated';
  const showNeedsYouBanner = needsYou.length > 0 && !list.some((c) => c.needsAttention);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await sms.refresh();
    } finally {
      setRefreshing(false);
    }
  };

  // Gate: AI SMS is unlocked by the `ai_sms` entitlement, or by already having
  // a number (e.g. a plan bought on iOS, which RevenueCat here doesn't see).
  // While either is resolving, hold on the gradient; otherwise show the paywall
  // at this entry point, and send a fresh purchase to setup for its number.
  if (entLoading || (!entitled && sms.phoneNumberLoading)) {
    return <DashboardGradient><SafeAreaView style={styles.safe} edges={['top']} /></DashboardGradient>;
  }
  if (!entitled && !sms.phoneNumber) {
    const toSetup = () => router.replace('/sms-setup');
    return <AiSmsPaywall onUnlocked={toSetup} onPurchasePending={toSetup} />;
  }
  const needsNumber = !sms.phoneNumber && !sms.phoneNumberLoading;

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={theme.accent} weight="semibold" />
            <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, theme.display(24)]}>AI Conversations</Text>
          <Pressable onPress={() => router.push('/sms-setup')} hitSlop={8} style={styles.gear}>
            <Icon name="gear" size={20} color={theme.accent} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const waiting = needsYou.filter((c) => c.status === f.key).length;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)}>
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accent : theme.cardBackground,
                      borderColor: active ? theme.accent : theme.divider,
                      borderRadius: theme.isEditorial ? 2 : 20,
                    },
                  ]}>
                  <Text style={[styles.chipText, { color: active ? theme.onAccent : theme.primaryText }]}>{f.label}</Text>
                  {waiting > 0 && (
                    <View style={[styles.chipCount, { backgroundColor: theme.cardBackground, borderColor: iOSColors.orange }]}>
                      <Text style={[styles.chipCountText, { color: iOSColors.orange }]}>{waiting}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {showNeedsYouBanner && (
          <Pressable
            onPress={() => setFilter(needsYouFilter)}
            style={[styles.needsBanner, { backgroundColor: withOpacity(iOSColors.orange, 0.15), borderColor: iOSColors.orange }]}>
            <Icon name="person.crop.circle.badge.exclamationmark.fill" size={18} color={iOSColors.orange} />
            <Text style={[styles.needsBannerText, { color: theme.primaryText }]}>
              {needsYou.length === 1 ? '1 conversation needs you' : `${needsYou.length} conversations need you`}
            </Text>
            <Icon name="chevron.right" size={12} color={theme.chevronTint} weight="medium" />
          </Pressable>
        )}

        {needsNumber ? (
          <View style={styles.empty}>
            <ThemedIconTile name="phone.fill" size={72} filled />
            <Text style={[styles.emptyTitle, theme.display(24)]}>Choose Your Number</Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>Your plan is active. Pick an area code to get your AI texting number.</Text>
            <ThemedButton title="Set Up My Number" onPress={() => router.push('/sms-setup')} style={styles.setupBtn} />
          </View>
        ) : list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bubble.left.and.bubble.right" size={80} color={theme.tertiaryText} />
            <Text style={[styles.emptyTitle, theme.display(24)]}>No Conversations Yet</Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>When clients text your AI number, their conversations will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(c) => c.id}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
            renderItem={({ item }) => (
              <ConversationRow conversation={item} onPress={() => router.push(`/sms-conversations/${item.id}`)} />
            )}
          />
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function ConversationRow({ conversation, onPress }: { conversation: SMSConversation; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      style={[styles.row, theme.card, conversation.needsAttention && { borderWidth: 2, borderColor: iOSColors.orange }]}
      onPress={onPress}>
      <ThemedIconTile name={smsStatusIcon(conversation.status)} size={44} />
      <View style={styles.flex}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.primaryText }]} numberOfLines={1}>{conversationDisplayName(conversation)}</Text>
          {conversation.lastMessageAt && <Text style={[styles.time, { color: theme.secondaryText }]}>{smsTimeAgo(conversation.lastMessageAt)}</Text>}
        </View>
        {conversation.lastMessage && <Text style={[styles.preview, { color: theme.secondaryText }]} numberOfLines={2}>{conversation.lastMessage}</Text>}
        <View style={styles.metaRow}>
          {conversation.messageCount != null && (
            <View style={styles.meta}>
              <Icon name="message.fill" size={10} color={theme.secondaryText} />
              <Text style={[styles.metaText, { color: theme.secondaryText }]}>{conversation.messageCount}</Text>
            </View>
          )}
          {conversation.needsAttention && (
            <View style={[styles.needsBadge, { backgroundColor: withOpacity(iOSColors.orange, 0.18) }]}>
              <Icon name="person.fill" size={10} color={iOSColors.orange} />
              <Text style={[styles.needsBadgeText, { color: iOSColors.orange }]}>Needs you</Text>
            </View>
          )}
          {conversation.hasAppointment && (
            <View style={styles.meta}>
              <Icon name="calendar.badge.checkmark" size={10} color={theme.live} />
              <Text style={[styles.metaText, { color: theme.live }]}>Booked</Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevron.right" size={14} color={theme.chevronTint} weight="medium" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center' },
  gear: { minWidth: 70, alignItems: 'flex-end' },
  filters: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '500' },
  chipCount: { minWidth: 18, height: 18, borderRadius: 9, borderWidth: 1, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  chipCountText: { fontSize: 11, fontWeight: '700' },
  needsBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  needsBannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  needsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  needsBadgeText: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  emptyTitle: { textAlign: 'center' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  setupBtn: { alignSelf: 'stretch' },
  list: { padding: 16, gap: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '600' },
  time: { fontSize: 12 },
  preview: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
});
