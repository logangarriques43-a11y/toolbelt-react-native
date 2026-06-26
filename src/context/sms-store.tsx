/**
 * AI SMS store — stands in for SMSService.swift (Twilio backend).
 * Holds seeded sample conversations + messages and a (fake) provisioned business
 * number so the AI Texting UI is fully navigable offline. Provisioning, escalate,
 * and reply mutate local state only — no real SMS is sent.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { uuid } from '@/lib/id';
import type { SMSConversation, SMSMessage, SMSPhoneNumber } from '@/models/sms';

function seed(): { conversations: SMSConversation[]; messages: Record<string, SMSMessage[]> } {
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();

  const c1 = 'conv-sarah';
  const c2 = 'conv-walkin';
  const c3 = 'conv-mike';

  const conversations: SMSConversation[] = [
    {
      id: c1,
      customerPhone: '+13105551087',
      customerName: 'Sarah Johnson',
      businessPhone: '+13105550100',
      status: 'active',
      conversationType: 'booking',
      lastMessage: 'Perfect, see you Thursday at 2pm!',
      messageCount: 4,
      hasAppointment: true,
      startedAt: iso(40),
      lastMessageAt: iso(6),
    },
    {
      id: c2,
      customerPhone: '+12065559921',
      businessPhone: '+13105550100',
      status: 'escalated',
      conversationType: 'support',
      lastMessage: 'I need to talk to someone about a refund.',
      messageCount: 3,
      hasAppointment: false,
      startedAt: iso(120),
      lastMessageAt: iso(55),
    },
    {
      id: c3,
      customerPhone: '+14155552314',
      customerName: 'Mike Chen',
      businessPhone: '+13105550100',
      status: 'completed',
      conversationType: 'booking',
      lastMessage: "You're all booked for Saturday. Thanks!",
      messageCount: 5,
      hasAppointment: true,
      startedAt: iso(2880),
      lastMessageAt: iso(2820),
    },
  ];

  const messages: Record<string, SMSMessage[]> = {
    [c1]: [
      { id: uuid(), direction: 'inbound', body: 'Hi! Do you have any openings this week?', aiIntentDetected: 'booking_inquiry', aiConfidence: 0.96, status: 'received', sentAt: iso(40) },
      { id: uuid(), direction: 'outbound', body: 'Hi Sarah! We have Thursday at 2pm or Friday at 11am. Which works best?', aiIntentDetected: 'offer_slots', aiConfidence: 0.92, status: 'delivered', sentAt: iso(38) },
      { id: uuid(), direction: 'inbound', body: 'Thursday at 2 is perfect.', aiIntentDetected: 'confirm_slot', aiConfidence: 0.98, status: 'received', sentAt: iso(8) },
      { id: uuid(), direction: 'outbound', body: 'Perfect, see you Thursday at 2pm!', aiIntentDetected: 'booking_confirmed', aiConfidence: 0.99, status: 'delivered', sentAt: iso(6) },
    ],
    [c2]: [
      { id: uuid(), direction: 'inbound', body: 'I was charged twice for my last visit.', aiIntentDetected: 'billing_issue', aiConfidence: 0.88, status: 'received', sentAt: iso(120) },
      { id: uuid(), direction: 'outbound', body: "I'm sorry about that! Let me look into it for you.", aiIntentDetected: 'acknowledge', aiConfidence: 0.7, status: 'delivered', sentAt: iso(118) },
      { id: uuid(), direction: 'inbound', body: 'I need to talk to someone about a refund.', aiIntentDetected: 'escalation_request', aiConfidence: 0.94, status: 'received', sentAt: iso(55) },
    ],
    [c3]: [
      { id: uuid(), direction: 'inbound', body: 'Can I book a haircut for Saturday?', aiIntentDetected: 'booking_inquiry', aiConfidence: 0.95, status: 'received', sentAt: iso(2880) },
      { id: uuid(), direction: 'outbound', body: 'Of course! We have 1pm or 3:30pm open Saturday.', aiIntentDetected: 'offer_slots', aiConfidence: 0.93, status: 'delivered', sentAt: iso(2878) },
      { id: uuid(), direction: 'inbound', body: '1pm please.', aiIntentDetected: 'confirm_slot', aiConfidence: 0.97, status: 'received', sentAt: iso(2825) },
      { id: uuid(), direction: 'outbound', body: "You're all booked for Saturday. Thanks!", aiIntentDetected: 'booking_confirmed', aiConfidence: 0.99, status: 'delivered', sentAt: iso(2820) },
    ],
  };

  return { conversations, messages };
}

export interface SMSStore {
  conversations: SMSConversation[];
  messagesFor: (conversationId: string) => SMSMessage[];
  conversationById: (id: string) => SMSConversation | undefined;
  phoneNumber: SMSPhoneNumber | null;
  provision: (areaCode: string | undefined, friendlyName?: string) => void;
  release: () => void;
  escalate: (conversationId: string) => void;
  sendReply: (conversationId: string, text: string) => void;
}

const SMSContext = createContext<SMSStore | null>(null);

export function SMSProvider({ children }: { children: ReactNode }) {
  const [{ conversations, messages }, setData] = useState(seed);
  const [phoneNumber, setPhoneNumber] = useState<SMSPhoneNumber | null>(null);

  const value = useMemo<SMSStore>(
    () => ({
      conversations,
      messagesFor: (id) => messages[id] ?? [],
      conversationById: (id) => conversations.find((c) => c.id === id),
      phoneNumber,
      provision: (areaCode, friendlyName) => {
        const ac = areaCode && /^\d{3}$/.test(areaCode) ? areaCode : '310';
        const line = `${Math.floor(1000000 + Math.random() * 8999999)}`;
        setPhoneNumber({
          id: uuid(),
          phoneNumber: `+1${ac}${line}`,
          friendlyName,
          isActive: true,
          monthlyCostCents: 100,
          createdAt: new Date().toISOString(),
        });
      },
      release: () => setPhoneNumber(null),
      escalate: (id) =>
        setData((prev) => ({
          ...prev,
          conversations: prev.conversations.map((c) => (c.id === id ? { ...c, status: 'escalated' } : c)),
        })),
      sendReply: (id, text) =>
        setData((prev) => {
          const msg: SMSMessage = { id: uuid(), direction: 'outbound', body: text, status: 'delivered', sentAt: new Date().toISOString() };
          return {
            conversations: prev.conversations.map((c) =>
              c.id === id ? { ...c, lastMessage: text, lastMessageAt: msg.sentAt, messageCount: (c.messageCount ?? 0) + 1 } : c,
            ),
            messages: { ...prev.messages, [id]: [...(prev.messages[id] ?? []), msg] },
          };
        }),
    }),
    [conversations, messages, phoneNumber],
  );

  return <SMSContext.Provider value={value}>{children}</SMSContext.Provider>;
}

export function useSMS(): SMSStore {
  const ctx = useContext(SMSContext);
  if (!ctx) throw new Error('useSMS must be used within an SMSProvider');
  return ctx;
}
