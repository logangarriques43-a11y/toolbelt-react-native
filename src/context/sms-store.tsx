/**
 * AI SMS store — RN counterpart to SMSService.swift (Twilio backend).
 * The inbox is backed by the real backend via React Query: conversations,
 * per-conversation messages, escalate ("take over"), agent replies, and the
 * provisioned business phone number.
 *
 * The number itself is bought by the setup screen (`provisionSmsNumber`), then
 * read back here from `/phone-numbers` via `refreshPhoneNumber`.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Alert } from 'react-native';

import {
  escalateConversation,
  getSmsAnalytics,
  listConversations,
  listMessages,
  listPhoneNumbers,
  sendSmsReply,
  type SmsAnalytics,
  type SmsAnalyticsPeriod,
} from '@/api/sms';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';
import { SIGNED_URL_REFRESH_MS } from '@/lib/tattoo';
import type { SMSConversation, SMSMessage, SMSPhoneNumber } from '@/models/sms';

const CONVERSATIONS_KEY = ['sms', 'conversations'] as const;
const PHONE_NUMBERS_KEY = ['sms', 'phone-numbers'] as const;
const messagesKey = (id: string) => ['sms', 'messages', id] as const;

export interface SMSStore {
  conversations: SMSConversation[];
  conversationById: (id: string) => SMSConversation | undefined;
  phoneNumber: SMSPhoneNumber | null;
  /** True until `/phone-numbers` has answered once. */
  phoneNumberLoading: boolean;
  /** Re-reads `/phone-numbers`, e.g. right after a number was provisioned. */
  refreshPhoneNumber: () => Promise<void>;
  escalate: (conversationId: string) => void;
  sendReply: (conversationId: string, text: string) => void;
  isLoading: boolean;
}

const SMSContext = createContext<SMSStore | null>(null);

function errMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Please check your connection and try again.';
}

export function SMSProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const convQuery = useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: listConversations });
  const phoneQuery = useQuery({ queryKey: PHONE_NUMBERS_KEY, queryFn: listPhoneNumbers });

  const conversations = convQuery.data ?? [];

  // The provisioned business line: the active number, else the first one.
  const phoneNumber = useMemo(() => {
    const list = phoneQuery.data ?? [];
    return list.find((p) => p.isActive) ?? list[0] ?? null;
  }, [phoneQuery.data]);

  const readConvs = () => qc.getQueryData<SMSConversation[]>(CONVERSATIONS_KEY) ?? [];
  const writeConvs = (next: SMSConversation[]) => qc.setQueryData(CONVERSATIONS_KEY, next);
  const readMsgs = (id: string) => qc.getQueryData<SMSMessage[]>(messagesKey(id)) ?? [];
  const writeMsgs = (id: string, next: SMSMessage[]) => qc.setQueryData(messagesKey(id), next);

  // ESCALATE — optimistically flip the conversation to escalated, POST, then
  // reconcile. Roll back + alert on failure.
  const escalate = (id: string) => {
    const prev = readConvs();
    writeConvs(prev.map((c) => (c.id === id ? { ...c, status: 'escalated' } : c)));
    escalateConversation(id)
      .then(() => qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY }))
      .catch((err) => {
        writeConvs(prev);
        Alert.alert("Couldn't take over", errMessage(err));
      });
  };

  // SEND REPLY — optimistically append an outbound bubble + bump the
  // conversation preview, send via Twilio, then refetch. Roll back on failure.
  const sendReply = (id: string, text: string) => {
    const prevMsgs = readMsgs(id);
    const prevConvs = readConvs();
    const sentAt = new Date().toISOString();
    const optimistic: SMSMessage = {
      id: `optimistic-${uuid()}`,
      direction: 'outbound',
      body: text,
      status: 'sending',
      sentAt,
    };
    writeMsgs(id, [...prevMsgs, optimistic]);
    writeConvs(
      prevConvs.map((c) =>
        c.id === id
          ? { ...c, lastMessage: text, lastMessageAt: sentAt, messageCount: (c.messageCount ?? 0) + 1 }
          : c,
      ),
    );
    sendSmsReply(id, text)
      .then(() => {
        qc.invalidateQueries({ queryKey: messagesKey(id) });
        qc.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      })
      .catch((err) => {
        writeMsgs(id, prevMsgs);
        writeConvs(prevConvs);
        Alert.alert("Couldn't send message", errMessage(err));
      });
  };

  const refreshPhoneNumber = async () => {
    await qc.invalidateQueries({ queryKey: PHONE_NUMBERS_KEY });
  };

  const value = useMemo<SMSStore>(
    () => ({
      conversations,
      conversationById: (id) => conversations.find((c) => c.id === id),
      phoneNumber,
      phoneNumberLoading: phoneQuery.isLoading,
      refreshPhoneNumber,
      escalate,
      sendReply,
      isLoading: convQuery.isLoading,
    }),
    // handlers close over stable refs (qc); re-derive on data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, phoneNumber, phoneQuery.isLoading, convQuery.isLoading],
  );

  return <SMSContext.Provider value={value}>{children}</SMSContext.Provider>;
}

export function useSMS(): SMSStore {
  const ctx = useContext(SMSContext);
  if (!ctx) throw new Error('useSMS must be used within an SMSProvider');
  return ctx;
}

/** A single conversation's messages, fetched from the backend on demand. */
export function useConversationMessages(conversationId: string): {
  messages: SMSMessage[];
  isLoading: boolean;
} {
  const query = useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => listMessages(conversationId),
    enabled: !!conversationId,
    // Photo links expire, so a thread with photos renews them while it's open.
    refetchInterval: (q) => (q.state.data?.some((m) => m.media?.length) ? SIGNED_URL_REFRESH_MS : false),
  });
  return { messages: query.data ?? [], isLoading: query.isLoading };
}

/** Period-scoped SMS analytics counts (null while loading / on error). */
export function useSmsAnalytics(period: SmsAnalyticsPeriod): SmsAnalytics | null {
  const query = useQuery({
    queryKey: ['sms', 'analytics', period],
    queryFn: () => getSmsAnalytics(period),
  });
  return query.data ?? null;
}
