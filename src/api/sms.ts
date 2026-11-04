/**
 * AI SMS API — maps the backend `/sms` + `/phone-numbers` DTOs (snake_case on
 * the wire) to/from the RN camelCase models. Mirrors the Swift SMSService.
 *
 * Only the inbox is wired here: list conversations, list a conversation's
 * messages, escalate ("take over"), hand back to the AI (resume), send an agent reply, and read the
 * provisioned business number, plus the self-serve number for a paid AI SMS
 * subscription: `POST /sms-number/provision` (owner only). A Google Play
 * purchase only records the entitlement (RevenueCat webhook); this call is what
 * buys the Twilio number. Afterwards the number is read from `/phone-numbers`.
 *
 * These routes live under smsRoutes, mounted at both /api and /api/v1 (the
 * latter added so the RN /api/v1 base can reach them). Every route is
 * Firebase-authed; conversations/messages return empty until the business has
 * a provisioned phone number.
 */

import { api, ApiError } from '@/lib/api-client';
import type { SMSConversation, SMSMedia, SMSMessage, SMSPhoneNumber, SMSStatus } from '@/models/sms';

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
  /** Human-only escalation: the customer texted an escalated thread, or it was just escalated. */
  needs_attention?: boolean | null;
  escalated_at?: string | null;
}

interface MessageDTO {
  id: string;
  direction: string;
  body: string;
  media?: SMSMedia[] | null;
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
    needsAttention: d.needs_attention === true,
    escalatedAt: d.escalated_at ?? undefined,
  };
}

function fromMessage(d: MessageDTO): SMSMessage {
  return {
    id: d.id,
    direction: d.direction === 'inbound' ? 'inbound' : 'outbound',
    body: d.body,
    media: d.media ?? [],
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

/**
 * Hands an escalated thread back to the AI: the server clears the escalated
 * state and `needs_attention`, and the AI answers the customer's next text.
 */
export async function resumeConversation(id: string): Promise<void> {
  await api.post(`/sms/conversations/${id}/resume`);
}

export async function sendSmsReply(conversationId: string, message: string): Promise<void> {
  await api.post('/sms/send', { conversationId, message });
}

export async function listPhoneNumbers(): Promise<SMSPhoneNumber[]> {
  const res = await api.get<{ phoneNumbers: PhoneNumberDTO[] }>('/phone-numbers');
  return (res.phoneNumbers ?? []).map(fromPhoneNumber);
}

/**
 * Where the business's AI SMS number stands. Same payload from
 * `GET /app-store/entitlement` and `POST /sms-number/provision`:
 *   ready   — entitled and the number is live
 *   pending — entitled, number still being set up (retry)
 *   failed  — entitled, setup failed this time (retry; the purchase stands)
 *   none    — not entitled
 */
export type SmsProvisioningStatus = 'ready' | 'pending' | 'failed' | 'none';

export interface SmsEntitlement {
  active: boolean;
  tier: string | null;
  tierName: string | null;
  provisioningStatus: SmsProvisioningStatus;
  phoneNumber: string | null;
}

interface EntitlementDTO {
  active?: boolean;
  tier?: string | null;
  tierName?: string | null;
  provisioningStatus?: string | null;
  phoneNumber?: string | null;
}

const PROVISIONING_STATUSES: SmsProvisioningStatus[] = ['ready', 'pending', 'failed', 'none'];

function fromEntitlement(d: EntitlementDTO): SmsEntitlement {
  const status = PROVISIONING_STATUSES.includes(d.provisioningStatus as SmsProvisioningStatus)
    ? (d.provisioningStatus as SmsProvisioningStatus)
    : 'none';
  return {
    active: d.active === true,
    tier: d.tier ?? null,
    tierName: d.tierName ?? null,
    provisioningStatus: status,
    phoneNumber: d.phoneNumber ?? null,
  };
}

/**
 * Buys (or returns the existing) AI SMS number for the signed-in owner's
 * business. Idempotent, so it doubles as "retry". Throws an ApiError with
 * status 402 / code `no_active_subscription` when there is no active plan.
 * A provisioning failure still answers 200 with `provisioningStatus: 'failed'`.
 */
export async function provisionSmsNumber(opts: {
  areaCode?: string;
  businessName?: string;
}): Promise<SmsEntitlement> {
  const body: { areaCode?: string; businessName?: string } = {};
  if (opts.areaCode && /^\d{3}$/.test(opts.areaCode)) body.areaCode = opts.areaCode;
  if (opts.businessName?.trim()) body.businessName = opts.businessName.trim();
  const res = await api.post<EntitlementDTO>('/sms-number/provision', body);
  return fromEntitlement(res ?? {});
}

/** True for the 402 the provision call answers without an active plan. */
export function isNoSubscriptionError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 402 || err.code === 'no_active_subscription');
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
