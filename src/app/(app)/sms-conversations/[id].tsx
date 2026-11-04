/**
 * AI Conversation thread — port of SMSConversationDetailView.swift.
 * Message bubbles (inbound left, outbound gradient right) with AI intent +
 * confidence meta, a status bar, a "Take Over" escalate action, and a reply bar.
 *
 * An escalated thread is human-only: the AI stays quiet until the owner hands
 * it back. A banner says so (louder when the customer is waiting) and carries
 * the "Hand back to AI" action, which calls resume and refreshes the thread.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardGradient } from '@/components/dashboard-gradient';
import { Icon } from '@/components/icon';
import { SignedPhoto } from '@/components/signed-photo';
import { useConversationMessages, useSMS } from '@/context/sms-store';
import { withOpacity } from '@/lib/color';
import { visibleMessageBody } from '@/lib/tattoo';
import { conversationDisplayName, formatPhone, type SMSMessage } from '@/models/sms';
import { iOSColors } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export default function SMSConversationDetail() {
  const theme = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sms = useSMS();
  const conversation = sms.conversationById(id);
  const { messages } = useConversationMessages(id);
  const [reply, setReply] = useState('');
  const [resuming, setResuming] = useState(false);

  // Opening a thread re-reads the list so the escalation banner is current
  // (the customer may have texted since the inbox last loaded).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void sms.refresh(); }, [id]);

  if (!conversation) {
    return (
      <DashboardGradient>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.missing}>
            <Text style={{ color: theme.secondaryText }}>Conversation not found.</Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: theme.accent, fontWeight: '600' }}>Go Back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </DashboardGradient>
    );
  }

  // Active = the look's live colour; escalated keeps the warning orange.
  const color =
    conversation.status === 'active' ? theme.live : conversation.status === 'escalated' ? iOSColors.orange : theme.secondaryText;
  const canSend = reply.trim().length > 0;

  const takeOver = () =>
    Alert.alert('Take Over Conversation', 'Escalate this to a human and stop AI auto-replies?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Over', style: 'destructive', onPress: () => sms.escalate(conversation.id) },
    ]);

  const handBack = () =>
    Alert.alert('Hand Back to AI', 'The AI will answer this customer\'s next text again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Hand Back',
        onPress: async () => {
          setResuming(true);
          try {
            await sms.resume(conversation.id);
          } finally {
            setResuming(false);
          }
        },
      },
    ]);

  const escalated = conversation.status === 'escalated';

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
              <Icon name="chevron.left" size={16} color={theme.accent} weight="semibold" />
              <Text style={[styles.backText, { color: theme.accent }]}>Back</Text>
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={[styles.headerName, { color: theme.primaryText }]} numberOfLines={1}>{conversationDisplayName(conversation)}</Text>
              <Text style={[styles.headerPhone, { color: theme.secondaryText }]}>{formatPhone(conversation.customerPhone)}</Text>
            </View>
            {conversation.status === 'active' ? (
              <Pressable onPress={takeOver} hitSlop={8} style={styles.menuBtn}>
                <Icon name="ellipsis.circle" size={20} color={theme.accent} />
              </Pressable>
            ) : (
              <View style={styles.menuBtn} />
            )}
          </View>

          {/* Status bar */}
          <View style={[styles.statusBar, theme.card]}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <Text style={[styles.statusText, { color }]}>{conversation.status[0].toUpperCase() + conversation.status.slice(1)}</Text>
            <View style={styles.flex} />
            {conversation.hasAppointment && (
              <View style={styles.booked}>
                <Icon name="calendar.badge.checkmark" size={12} color={theme.live} />
                <Text style={[styles.bookedText, { color: theme.live }]}>Appointment Booked</Text>
              </View>
            )}
          </View>

          {/* Human-only banner */}
          {escalated && (
            <View
              style={[
                styles.escalatedBanner,
                {
                  backgroundColor: withOpacity(iOSColors.orange, conversation.needsAttention ? 0.18 : 0.1),
                  borderColor: conversation.needsAttention ? iOSColors.orange : withOpacity(iOSColors.orange, 0.4),
                },
              ]}>
              <View style={styles.escalatedTop}>
                <Icon
                  name={conversation.needsAttention ? 'person.crop.circle.badge.exclamationmark.fill' : 'person.fill'}
                  size={18}
                  color={iOSColors.orange}
                />
                <View style={styles.flex}>
                  <Text style={[styles.escalatedTitle, { color: theme.primaryText }]}>
                    {conversation.needsAttention ? 'Needs you' : "You're handling this"}
                  </Text>
                  <Text style={[styles.escalatedSub, { color: theme.secondaryText }]}>
                    {conversation.needsAttention
                      ? 'The customer is waiting for a reply. The AI won\'t answer until you hand it back.'
                      : 'The AI is paused for this conversation until you hand it back.'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={handBack}
                disabled={resuming}
                style={[styles.handBackBtn, { borderColor: theme.accent, opacity: resuming ? 0.6 : 1 }]}>
                {resuming ? (
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <>
                    <Icon name="sparkles" size={14} color={theme.accent} />
                    <Text style={[styles.handBackText, { color: theme.accent }]}>Hand back to AI</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

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
              style={[styles.replyInput, { backgroundColor: theme.cardBackground, borderColor: theme.divider, color: theme.primaryText }]}
            />
            <Pressable onPress={send} disabled={!canSend}>
              <Icon name="arrow.up.circle.fill" size={34} color={canSend ? theme.accent : theme.tertiaryText} />
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
  const media = message.media ?? [];
  const body = visibleMessageBody(message.body, media);
  const photos = media.map((m) => <SignedPhoto key={m.id} url={m.url} style={styles.bubblePhoto} />);
  return (
    <View style={[styles.bubbleRow, { justifyContent: inbound ? 'flex-start' : 'flex-end' }]}>
      <View style={[styles.bubbleCol, { alignItems: inbound ? 'flex-start' : 'flex-end' }]}>
        {inbound ? (
          <View style={[styles.bubble, styles.inboundBubble, { backgroundColor: theme.cardBackground, borderColor: theme.divider }]}>
            {photos}
            {body !== null ? <Text style={[styles.bubbleText, { color: theme.primaryText }]}>{body}</Text> : null}
          </View>
        ) : (
          <View style={[styles.bubble, { backgroundColor: theme.accent }]}>
            {photos}
            {body !== null ? <Text style={[styles.bubbleText, { color: theme.onAccent }]}>{body}</Text> : null}
          </View>
        )}
        <View style={styles.bubbleMeta}>
          {message.aiIntentDetected && (
            <View style={[styles.intent, { backgroundColor: theme.inputBackground }]}>
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
  statusBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  booked: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bookedText: { fontSize: 12 },
  escalatedBanner: { marginHorizontal: 16, marginTop: 10, padding: 12, gap: 10, borderRadius: 12, borderWidth: 1 },
  escalatedTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  escalatedTitle: { fontSize: 15, fontWeight: '700' },
  escalatedSub: { fontSize: 13, marginTop: 2 },
  handBackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, minHeight: 36 },
  handBackText: { fontSize: 14, fontWeight: '600' },
  messages: { padding: 16, gap: 8 },
  bubbleRow: { flexDirection: 'row' },
  bubbleCol: { maxWidth: '80%', gap: 4 },
  bubble: { padding: 12, borderRadius: 18, gap: 8 },
  bubblePhoto: { width: 200, height: 200, borderRadius: 12 },
  inboundBubble: { borderWidth: 1 },
  bubbleText: { fontSize: 16 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  intent: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 },
  intentText: { fontSize: 10 },
  metaSmall: { fontSize: 10, fontVariant: ['tabular-nums'] },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  replyInput: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1, fontSize: 16 },
});
