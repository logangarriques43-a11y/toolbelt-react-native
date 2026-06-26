/**
 * AI SMS models — port of the response models in SMSService.swift
 * (SMSConversation, SMSMessage, SMSPhoneNumber). The real feature is Twilio-backed;
 * here these back an in-memory stub store so the UI is faithful without a backend.
 */

export type SMSStatus = 'active' | 'escalated' | 'completed';

export interface SMSConversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  businessPhone?: string;
  status: SMSStatus;
  conversationType: string;
  lastMessage?: string;
  messageCount?: number;
  hasAppointment?: boolean;
  /** ISO datetime. */
  startedAt?: string;
  /** ISO datetime. */
  lastMessageAt?: string;
}

export interface SMSMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  aiIntentDetected?: string;
  aiConfidence?: number;
  status: string;
  errorCode?: string;
  /** ISO datetime. */
  sentAt?: string;
}

export interface SMSPhoneNumber {
  id: string;
  phoneNumber: string;
  friendlyName?: string;
  isActive: boolean;
  monthlyCostCents?: number;
  /** ISO datetime. */
  createdAt?: string;
}

export const SMS_STATUS_COLORS: Record<SMSStatus, string> = {
  active: '#4CBF80',
  escalated: '#F29933',
  completed: '#8E8E93',
};

export function smsStatusIcon(status: SMSStatus): import('expo-symbols').SymbolViewProps['name'] {
  switch (status) {
    case 'active':
      return 'bubble.left.fill';
    case 'escalated':
      return 'person.fill';
    case 'completed':
      return 'checkmark';
  }
}

/** "+13105551234" → "(310) 555-1234" when it's a US 11-digit number. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11 || !digits.startsWith('1')) return phone;
  return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
}

export function conversationDisplayName(c: SMSConversation): string {
  return c.customerName ?? formatPhone(c.customerPhone);
}

export function smsTimeAgo(iso: string, now = Date.now()): string {
  const sec = (now - new Date(iso).getTime()) / 1000;
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

export const POPULAR_AREA_CODES: { code: string; city: string }[] = [
  { code: '212', city: 'New York, NY' },
  { code: '310', city: 'Los Angeles, CA' },
  { code: '312', city: 'Chicago, IL' },
  { code: '305', city: 'Miami, FL' },
  { code: '415', city: 'San Francisco, CA' },
  { code: '404', city: 'Atlanta, GA' },
  { code: '214', city: 'Dallas, TX' },
  { code: '206', city: 'Seattle, WA' },
  { code: '617', city: 'Boston, MA' },
  { code: '702', city: 'Las Vegas, NV' },
  { code: '602', city: 'Phoenix, AZ' },
  { code: '303', city: 'Denver, CO' },
];
