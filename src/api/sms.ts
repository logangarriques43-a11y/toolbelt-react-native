/**
 * AI SMS API — maps the backend `/sms` + `/phone-numbers` DTOs (snake_case on
 * the wire) to/from the RN camelCase models. Mirrors the Swift SMSService.
 *
 * Only the inbox is wired here: list conversations, list a conversation's
 * messages, escalate ("take over"), send an agent reply, and read the
 * provisioned business number. Number provisioning is a Stripe-checkout flow
 * (`/phone-numbers/checkout`, and `/phone-numbers/provision` is admin-only), so
 * it stays deferred with the payments work.
 *
 * These routes live under smsRoutes, mounted at both /api and /api/v1 (the
 * latter added so the RN /api/v1 base can reach them). Every route is
 * Firebase-authed; conversations/messages return empty until the business has
 * a provisioned phone number.
 */

import { api } from '@/lib/api-client';
import type { SMSConversation, SMSMessage, SMSPhoneNumber, SMSStatus } from '@/models/sms';

interface ConversationDTO {
  id: string;
  customer_phone: string;
  customer_name?: string | null;
  business_phone?: string | null;
  status: string;
  conversation_type?: string | null;
  last_message?: string | null;
  message_count?: number | null;
  has_appointment?: boolean | null;
  started_at?: string | null;
  last_message_at?: string | null;
}

interface MessageDTO {
  id: string;
  direction: string;
  body: string;
  ai_intent_detected?: string | null;
  ai_confidence?: number | null;
  status: string;
  error_code?: string | null;
  sent_at?: string | null;
}

interface PhoneNumberDTO {
  id: string;
  phone_number: string;
  friendly_name?: string | null;
  is_active: boolean;
  monthly_cost_cents?: number | null;
  created_at?: string | null;
}

const KNOWN_STATUSES: SMSStatus[] = ['active', 'escalated', 'completed'];

function fromConversation(d: ConversationDTO): SMSConversation {
  return {
    id: d.id,
    customerPhone: d.customer_phone,
    customerName: d.customer_name ?? undefined,
    businessPhone: d.business_phone ?? undefined,
    status: KNOWN_STATUSES.includes(d.status as SMSStatus) ? (d.status as SMSStatus) : 'active',
    conversationType: d.conversation_type ?? 'booking',
    lastMessage: d.last_message ?? undefined,
    messageCount: d.message_count ?? 0,
    hasAppointment: d.has_appointment ?? false,
    startedAt: d.started_at ?? undefined,
    lastMessageAt: d.last_message_at ?? undefined,
  };
}

function fromMessage(d: MessageDTO): SMSMessage {
  return {
    id: d.id,
    direction: d.direction === 'inbound' ? 'inbound' : 'outbound',
    body: d.body,
    aiIntentDetected: d.ai_intent_detected ?? undefined,
    aiConfidence: d.ai_confidence ?? undefined,
    status: d.status,
    errorCode: d.error_code ?? undefined,
    sentAt: d.sent_at ?? undefined,
  };
}

function fromPhoneNumber(d: PhoneNumberDTO): SMSPhoneNumber {
  return {
    id: d.id,
    phoneNumber: d.phone_number,
    friendlyName: d.friendly_name ?? undefined,
    isActive: d.is_active === true,
    monthlyCostCents: d.monthly_cost_cents ?? undefined,
    createdAt: d.created_at ?? undefined,
  };
}

export async function listConversations(): Promise<SMSConversation[]> {
  const res = await api.get<{ conversations: ConversationDTO[] }>('/sms/conversations');
  return (res.conversations ?? []).map(fromConversation);
}

export async function listMessages(conversationId: string): Promise<SMSMessage[]> {
  const res = await api.get<{ messages: MessageDTO[] }>(
    `/sms/conversations/${conversationId}/messages`,
  );
  return (res.messages ?? []).map(fromMessage);
}

export async function escalateConversation(id: string): Promise<void> {
  await api.post(`/sms/conversations/${id}/escalate`);
}

export async function sendSmsReply(conversationId: string, message: string): Promise<void> {
  await api.post('/sms/send', { conversationId, message });
}

export async function listPhoneNumbers(): Promise<SMSPhoneNumber[]> {
  const res = await api.get<{ phoneNumbers: PhoneNumberDTO[] }>('/phone-numbers');
  return (res.phoneNumbers ?? []).map(fromPhoneNumber);
}

export type SmsAnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year';

/** GET /sms/analytics counts. Field names are already camelCase on the wire. */
export interface SmsAnalytics {
  totalConversations: number;
  totalMessagesInbound: number;
  totalMessagesOutbound: number;
  appointmentsBooked: number;
  escalatedConversations?: number;
  escalationRate: number;
  estimatedCost: number;
}

/**
 * SMS counts for the business, period-scoped to match the analytics pills
 * (the backend's period math mirrors the app's). Returns zeros when the
 * business has no provisioned number.
 */
export async function getSmsAnalytics(period: SmsAnalyticsPeriod): Promise<SmsAnalytics> {
  return api.get<SmsAnalytics>('/sms/analytics', { period });
}
