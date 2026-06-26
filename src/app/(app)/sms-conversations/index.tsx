/**
 * AI Conversations — port of SMSConversationsView.swift.
 * Status-filtered list of AI SMS conversations over the stub store. Tap a row to
 * open the thread; the gear opens the phone-number setup. Backend polling is N/A.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { useSMS } from '@/context/sms-store';
import { withOpacity } from '@/lib/color';
import {
  conversationDisplayName,
  SMS_STATUS_COLORS,
  smsStatusIcon,
  smsTimeAgo,
  type SMSConversation,
  type SMSStatus,
} from '@/models/sms';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#4285F5';
const PURPLE = '#9966E6';
const GREEN = '#4CBF80';
const FILTERS: { key: SMSStatus; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'escalated', label: 'Escalated' },
  { key: 'completed', label: 'Completed' },
];

export default function SMSConversations() {
  const theme = useAppTheme();
  const router = useRouter();
  const sms = useSMS();
  const [filter, setFilter] = useState<SMSStatus>('active');

  const list = sms.conversations.filter((c) => c.status === filter);

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Icon name="chevron.left" size={16} color={BLUE} weight="semibold" />
            <Text style={[styles.backText, { color: BLUE }]}>Back</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.primaryText }]}>AI Conversations</Text>
          <Pressable onPress={() => router.push('/sms-setup')} hitSlop={8} style={styles.gear}>
            <Icon name="gear" size={20} color={BLUE} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable key={f.key} onPress={() => setFilter(f.key)}>
                {active ? (
                  <LinearGradient colors={[BLUE, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
                    <Text style={[styles.chipText, { color: '#FFFFFF' }]}>{f.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.chip, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
                    <Text style={[styles.chipText, { color: theme.primaryText }]}>{f.label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bubble.left.and.bubble.right" size={80} color={theme.tertiaryText} />
            <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No Conversations Yet</Text>
            <Text style={[styles.emptySub, { color: theme.secondaryText }]}>When clients text your AI number, their conversations will appear here.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {list.map((c) => (
              <ConversationRow key={c.id} conversation={c} onPress={() => router.push(`/sms-conversations/${c.id}`)} />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </DashboardGradient>
  );
}

function ConversationRow({ conversation, onPress }: { conversation: SMSConversation; onPress: () => void }) {
  const theme = useAppTheme();
  const color = SMS_STATUS_COLORS[conversation.status];
  return (
    <Pressable style={[styles.row, { backgroundColor: theme.cardBackground }, lightShadow(theme)]} onPress={onPress}>
      <View style={[styles.avatar, { backgroundColor: withOpacity(color, 0.15) }]}>
        <Icon name={smsStatusIcon(conversation.status)} size={20} color={color} />
      </View>
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
          {conversation.hasAppointment && (
            <View style={styles.meta}>
              <Icon name="calendar.badge.checkmark" size={10} color={GREEN} />
              <Text style={[styles.metaText, { color: GREEN }]}>Booked</Text>
            </View>
          )}
        </View>
      </View>
      <Icon name="chevron.right" size={14} color={withOpacity(iOSColors.gray, 0.5)} weight="medium" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 70 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '700' },
  gear: { minWidth: 70, alignItems: 'flex-end' },
  filters: { gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { flex: 1, fontSize: 17, fontWeight: '600' },
  time: { fontSize: 12 },
  preview: { fontSize: 14, marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
});
