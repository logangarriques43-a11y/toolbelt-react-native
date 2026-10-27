/**
 * The AI helper chat, presented as a sheet from the home screen (port of
 * HelperChatView.swift). Replies can carry buttons; tapping one hands the
 * screen key back to the home screen, which closes the sheet and navigates.
 */

import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { HelperSnapshot } from '@/api/helper';
import { HELPER_SUGGESTIONS, type HelperChat, type HelperMessage } from '@/components/ai-helper/use-helper-chat';
import { Icon } from '@/components/icon';
import { DISPLAY_FONT } from '@/theme/tokens';
import { useAppTheme } from '@/theme/theme-context';

export function HelperChatSheet({
  visible,
  chat,
  snapshot,
  onClose,
  onOpen,
}: {
  visible: boolean;
  chat: HelperChat;
  /** Built fresh for every question so it reflects the latest setup. */
  snapshot: () => HelperSnapshot;
  onClose: () => void;
  onOpen: (screen: string) => void;
}) {
  const theme = useAppTheme();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [chat.messages.length, chat.isSending]);

  const canSend = !chat.isSending && draft.trim().length > 0;
  const ask = (text: string) => {
    if (chat.isSending) return;
    chat.send(text, snapshot());
    setDraft('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.fill, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Icon name="sparkles" size={16} color={theme.accent} />
            <Text style={[styles.headerTitle, { color: theme.primaryText }]}>AI helper</Text>
            <View style={styles.spacer} />
            {chat.messages.length > 0 ? (
              <Pressable onPress={chat.reset} disabled={chat.isSending} hitSlop={8}>
                <Text style={[styles.link, { color: theme.accent, opacity: chat.isSending ? 0.4 : 1 }]}>New chat</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close"
              style={[styles.close, { backgroundColor: theme.inputBackground }]}>
              <Icon name="xmark" size={14} color={theme.secondaryText} />
            </Pressable>
          </View>
          <View style={[styles.rule, { backgroundColor: theme.divider }]} />

          <ScrollView ref={scroll} style={styles.fill} contentContainerStyle={styles.transcript} keyboardDismissMode="interactive">
            {chat.messages.length === 0 ? (
              <View style={styles.empty}>
                <Text style={[styles.body, { color: theme.primaryText }]}>
                  Ask how to set up or use anything in ToolBelt. I&apos;ll walk you through it and take you to the right screen.
                </Text>
                <View style={styles.suggestions}>
                  {HELPER_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => ask(s)}
                      style={({ pressed }) => [theme.card, styles.suggestion, { borderRadius: theme.isEditorial ? 2 : 14 }, pressed ? styles.pressed : null]}>
                      <Text style={[styles.suggestionText, { color: theme.primaryText }]}>{s}</Text>
                      <Icon name="arrow.up.right" size={12} color={theme.secondaryText} />
                    </Pressable>
                  ))}
                </View>
                <Text style={[styles.note, { color: theme.secondaryText }]}>
                  The helper sees your setup (services, staff, what&apos;s connected), not client details. It can make mistakes.
                </Text>
              </View>
            ) : null}

            {chat.messages.map((m) => (
              <Bubble key={m.id} message={m} disabled={chat.isSending} onRetry={() => chat.retry(snapshot())} onOpen={onOpen} />
            ))}

            {chat.isSending ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.note, { color: theme.secondaryText }]}>Thinking…</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.inputBar, { borderTopColor: theme.divider, backgroundColor: theme.background }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask a question…"
              placeholderTextColor={theme.tertiaryText}
              multiline
              maxLength={2000}
              style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.primaryText }]}
              onSubmitEditing={() => ask(draft)}
              submitBehavior="submit"
              returnKeyType="send"
            />
            <Pressable
              onPress={() => ask(draft)}
              disabled={!canSend}
              accessibilityLabel="Send"
              style={[styles.send, { backgroundColor: theme.accent, opacity: canSend ? 1 : 0.4 }]}>
              <Icon name="arrow.up" size={16} color={theme.onAccent} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Bubble({
  message,
  disabled,
  onRetry,
  onOpen,
}: {
  message: HelperMessage;
  disabled: boolean;
  onRetry: () => void;
  onOpen: (screen: string) => void;
}) {
  const theme = useAppTheme();
  if (message.isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 18 }]}>
          <Text style={[styles.body, { color: theme.onAccent }]}>{message.text}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.reply}>
      <Text selectable style={[styles.body, { color: message.isError ? theme.secondaryText : theme.primaryText }]}>
        {inlineBold(message.text, theme.primaryText)}
      </Text>
      {message.isError ? (
        <Pressable onPress={onRetry} disabled={disabled} hitSlop={8}>
          <Text style={[styles.link, { color: theme.accent, opacity: disabled ? 0.4 : 1 }]}>Try again</Text>
        </Pressable>
      ) : null}
      {message.actions.map((a) => (
        <Pressable
          key={a.screen}
          onPress={() => onOpen(a.screen)}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.accent, borderRadius: theme.isEditorial ? 2 : 999 },
            pressed ? styles.pressed : null,
          ]}>
          <Text style={[styles.actionText, { color: theme.onAccent }]}>{a.label}</Text>
          <Icon name="arrow.right" size={14} color={theme.onAccent} />
        </Pressable>
      ))}
    </View>
  );
}

/** Renders **bold** spans; keeps the model's line breaks (one step per line). */
function inlineBold(text: string, color: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Text key={i} style={{ fontWeight: '700', color }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    ),
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: DISPLAY_FONT, fontSize: 20 },
  spacer: { flex: 1 },
  link: { fontSize: 15, fontWeight: '600' },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1 },
  transcript: { padding: 20, gap: 14 },
  empty: { gap: 16 },
  body: { fontSize: 15, lineHeight: 21 },
  suggestions: { gap: 8 },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  suggestionText: { flex: 1, fontSize: 15, fontWeight: '500' },
  note: { fontSize: 13 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 48 },
  userBubble: { paddingHorizontal: 14, paddingVertical: 10 },
  reply: { gap: 10, paddingRight: 24, alignItems: 'flex-start' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { fontSize: 15, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  input: { flex: 1, maxHeight: 110, fontSize: 16, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, borderRadius: 20 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
});
