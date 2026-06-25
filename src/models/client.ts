/**
 * Client model — port of Client.swift.
 * Photo is held as a local URI (RN) rather than Data; backend-sync fields are
 * deferred. SMS-consent fields are kept for A2P 10DLC fidelity.
 */

export interface Client {
  id: string;
  name: string;
  phoneNumber: string;
  secondaryPhoneNumber?: string;
  email?: string;
  notes?: string;
  location?: string;
  /** ISO date string. */
  birthday?: string;
  photoUri?: string;
  /** Extra buffer minutes, stacks onto service block time. */
  clientBlockTime: number;
  smsConsentGiven: boolean;
  smsConsentDate?: string;
  smsConsentMethod?: string;
}

/** Two-letter initials from the name (mirrors `Client.initials`). */
export function clientInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return '?';
}
