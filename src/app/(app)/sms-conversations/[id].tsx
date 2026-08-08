/**
 * AI Conversation thread — port of SMSConversationDetailView.swift.
 * Message bubbles (inbound left, outbound gradient right) with AI intent +
 * confidence meta, a status bar, a "Take Over" escalate action, and a reply bar.
 * Replies append locally (no real SMS).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { useConversationMessages, useSMS } from '@/context/sms-store';
import { withOpacity } from '@/lib/color';
import { conversationDisplayName, formatPhone, SMS_STATUS_COLORS, type SMSMessage } from '@/models/sms';
import { iOSColors, lightShadow } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const BLUE = '#4285F5';
const PURPLE = '#9966E6';
const GREEN = '#4CBF80';
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export default function SMSConversationDetail() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sms = useSMS();
  const conversation = sms.conversationById(id);
  const { messages } = useConversationMessages(id);
  const [reply, setReply] = useState('');

  if (!conversation) {
    return (
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.missing}>
            <Text style={{ color: theme.secondaryText }}>Conversation not found.</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: BLUE, fontWeight: '600' }}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </DashboardGradient>
    );
  }

  const color = SMS_STATUS_COLORS[conversation.status];
  const canSend = reply.trim().length > 0;

  const takeOver = () =>
    Alert.alert('Take Over Conversation', 'Escalate this to a human and stop AI auto-replies?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Over', style: 'destructive', onPress: () => sms.escalate(conversation.id) },
    ]);

  const send = () => {
    if (!canSend) return;
    sms.sendReply(conversation.id, reply.trim());
    setReply('');
  };

  return (
    <DashboardGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
              <Icon name="chevron.left" size={16} color={BLUE} weight="semibold" />
              <Text style={[styles.backText, { color: BLUE }]}>Back</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerName, { color: theme.primaryText }]} numberOfLines={1}>{conversationDisplayName(conversation)}</Text>
              <Text style={[styles.headerPhone, { color: theme.secondaryText }]}>{formatPhone(conversation.customerPhone)}</Text>
            </View>
            {conversation.status === 'active' ? (
              <Pressable onPress={takeOver} hitSlop={8} style={styles.menuBtn}>
                <Icon name="ellipsis.circle" size={20} color={BLUE} />
              </Pressable>
            ) : (
              <View style={styles.menuBtn} />
            )}
          </View>

          {/* Status bar */}
          <View style={[styles.statusBar, { backgroundColor: theme.cardBackground }, lightShadow(theme)]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{conversation.status[0].toUpperCase() + conversation.status.slice(1)}</Text>
            <View style={styles.flex} />
            {conversation.hasAppointment && (
              <View style={styles.booked}>
                <Icon name="calendar.badge.checkmark" size={12} color={GREEN} />
                <Text style={[styles.bookedText, { color: GREEN }]}>Appointment Booked</Text>
              </View>
            )}
          </View>

          {/* Messages */}
          <ScrollView contentContainerStyle={styles.messages}>
            {messages.map((m) => (
              <Bubble key={m.id} message={m} />
            ))}
          </ScrollView>

          {/* Reply bar */}
          <View style={styles.replyBar}>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Type a reply..."
              placeholderTextColor={theme.secondaryText}
              multiline
              style={[styles.replyInput, { backgroundColor: theme.cardBackground, color: theme.primaryText }]}
            />
            <Pressable onPress={send} disabled={!canSend}>
              <Icon name="arrow.up.circle.fill" size={34} color={canSend ? BLUE : iOSColors.gray} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </DashboardGradient>
  );
}

function Bubble({ message }: { message: SMSMessage }) {
  const theme = useAppTheme();
  const inbound = message.direction === 'inbound';
  return (
    <View style={[styles.bubbleRow, { justifyContent: inbound ? 'flex-start' : 'flex-end' }]}>
      <View style={[styles.bubbleCol, { alignItems: inbound ? 'flex-start' : 'flex-end' }]}>
        {inbound ? (
          <View style={[styles.bubble, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.bubbleText, { color: '#000000' }]}>{message.body}</Text>
          </View>
        ) : (
          <LinearGradient colors={[BLUE, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubble}>
            <Text style={[styles.bubbleText, { color: '#FFFFFF' }]}>{message.body}</Text>
          </LinearGradient>
        )}
        <View style={styles.bubbleMeta}>
          {message.aiIntentDetected && (
            <View style={[styles.intent, { backgroundColor: theme.cardBackground }]}>
              <Text style={[styles.intentText, { color: theme.secondaryText }]}>{message.aiIntentDetected}</Text>
            </View>
          )}
          {message.aiConfidence != null && message.aiConfidence > 0 && (
            <Text style={[styles.metaSmall, { color: theme.secondaryText }]}>{Math.round(message.aiConfidence * 100)}%</Text>
          )}
          {message.sentAt && <Text style={[styles.metaSmall, { color: theme.secondaryText }]}>{timeFmt.format(new Date(message.sentAt))}</Text>}
          {message.status === 'failed' && <Icon name="exclamationmark.circle.fill" size={10} color={iOSColors.red} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 64 },
  backText: { fontSize: 16, fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerName: { fontSize: 18, fontWeight: '700' },
  headerPhone: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  menuBtn: { minWidth: 64, alignItems: 'flex-end' },
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginHorizontal: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  booked: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookedText: { fontSize: 12 },
  messages: { padding: 16, gap: 8 },
  bubbleRow: { flexDirection: 'row' },
  bubbleCol: { maxWidth: '80%', gap: 4 },
  bubble: { padding: 12, borderRadius: 18 },
  bubbleText: { fontSize: 16 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  intent: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  intentText: { fontSize: 10 },
  metaSmall: { fontSize: 10, fontVariant: ['tabular-nums'] },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  replyInput: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, fontSize: 16 },
});
