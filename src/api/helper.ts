/**
 * AI helper API — `POST /helper/chat`. The backend holds the app guide and
 * the model; the app sends the recent chat and a setup snapshot (counts and
 * what's connected — never client names, phones or appointment details). The
 * server whitelists the snapshot fields again before they reach the model.
 */

import { api } from '@/lib/api-client';

export interface HelperSnapshot {
  businessName: string | null;
  role: 'owner' | 'staff';
  counts: { services: number; staff: number; clients: number; upcomingAppointments: number };
  /** null = not known yet (e.g. still loading). */
  setup: { aiTexting: boolean | null; onlineBooking: boolean | null; payouts: boolean | null };
  serviceNames: string[];
  staffNames: string[];
  /** Screen keys this user can't open (lib/helper-destinations.ts). */
  unavailableScreens: string[];
}

export interface HelperTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface HelperReply {
  reply: string;
  actions: { screen: string; label: string }[];
}

export async function sendHelperChat(messages: HelperTurn[], snapshot: HelperSnapshot): Promise<HelperReply> {
  const res = await api.post<HelperReply>('/helper/chat', { messages, snapshot });
  return { reply: res?.reply ?? '', actions: Array.isArray(res?.actions) ? res.actions : [] };
}
