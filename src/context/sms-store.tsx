/**
 * AI SMS store — RN counterpart to SMSService.swift (Twilio backend).
 * The inbox is backed by the real backend via React Query: conversations,
 * per-conversation messages, escalate ("take over"), agent replies, and the
 * provisioned business phone number.
 *
 * Number provisioning is a Stripe-checkout flow on the backend (deferred with
 * the payments work), so `provision`/`release` remain LOCAL stubs — a fake
 * number is kept only in memory and is shown only when the business has no
 * real number, so the setup screen still demos without corrupting real data.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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
import type { SMSConversation, SMSMessage, SMSPhoneNumber } from '@/models/sms';

const CONVERSATIONS_KEY = ['sms', 'conversations'] as const;
const PHONE_NUMBERS_KEY = ['sms', 'phone-numbers'] as const;
const messagesKey = (id: string) => ['sms', 'messages', id] as const;

export interface SMSStore {
  conversations: SMSConversation[];
  conversationById: (id: string) => SMSConversation | undefined;
  phoneNumber: SMSPhoneNumber | null;
  provision: (areaCode: string | undefined, friendlyName?: string) => void;
  release: () => void;
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
  const [stubNumber, setStubNumber] = useState<SMSPhoneNumber | null>(null);

  const conversations = convQuery.data ?? [];

  // The provisioned business line: the active number, else the first one. A
  // local stub (from the deferred provision flow) only shows when there's none.
  const realNumber = useMemo(() => {
    const list = phoneQuery.data ?? [];
    return list.find((p) => p.isActive) ?? list[0] ?? null;
  }, [phoneQuery.data]);
  const phoneNumber = realNumber ?? stubNumber;

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

  // Deferred: real provisioning is a Stripe checkout ($/mo) + Twilio purchase.
  // Keep a local stub so the setup screen demos; it never touches the backend.
  const provision = (areaCode: string | undefined, friendlyName?: string) => {
    const ac = areaCode && /^\d{3}$/.test(areaCode) ? areaCode : '310';
    const line = `${Math.floor(1000000 + Math.random() * 8999999)}`;
    setStubNumber({
      id: uuid(),
      phoneNumber: `+1${ac}${line}`,
      friendlyName,
      isActive: true,
      monthlyCostCents: 100,
      createdAt: new Date().toISOString(),
    });
  };
  const release = () => setStubNumber(null);

  const value = useMemo<SMSStore>(
    () => ({
      conversations,
      conversationById: (id) => conversations.find((c) => c.id === id),
      phoneNumber,
      provision,
      release,
      escalate,
      sendReply,
      isLoading: convQuery.isLoading,
    }),
    // handlers close over stable refs (qc, setStubNumber); re-derive on data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conversations, phoneNumber, convQuery.isLoading],
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
