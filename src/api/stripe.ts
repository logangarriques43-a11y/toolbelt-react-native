/**
 * Stripe API — the backend's `/stripe/connect/*` (payout onboarding + status)
 * and `/stripe/payments/*` (PaymentSheet card charges + Terminal Tap to Pay)
 * routes, the same ones the Swift app's StripeConnectService / PaymentService
 * call. All amounts on the wire are integer cents (USD, min 50).
 *
 * The backend never talks to Stripe from the client: it creates the Express
 * account, onboarding links, PaymentIntents (with the 1% platform fee) and
 * Terminal connection tokens on the business's connected account.
 */

import { api } from '@/lib/api-client';

// ── Connect (payouts) ────────────────────────────────────────────────

export type ConnectAccountStatus = 'approved' | 'restricted' | 'pending' | 'rejected';

export interface ConnectRequirementError {
  requirement: string;
  code: string;
  reason: string;
}

export interface AccountStatus {
  hasAccount: boolean;
  stripeAccountId?: string;
  accountStatus?: ConnectAccountStatus;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  currentlyDue?: string[];
  pendingVerification?: string[];
  disabledReason?: string | null;
  errors?: ConnectRequirementError[];
  bankLast4?: string | null;
  bankName?: string | null;
}

export interface NextPayout {
  amount: number;
  currency: string;
  status: string;
  /** Unix seconds. */
  arrivalDate: number;
}

export interface PayoutBalance {
  hasAccount: boolean;
  currency: string;
  /** Cents. */
  pending: number;
  /** Cents. */
  available: number;
  nextPayout: NextPayout | null;
}

/** Approved = Stripe says approved, or both charges and payouts are on. */
export function isAccountApproved(s: AccountStatus | null | undefined): boolean {
  if (!s?.hasAccount) return false;
  return s.accountStatus === 'approved' || (!!s.chargesEnabled && !!s.payoutsEnabled);
}

export function getAccountStatus(): Promise<AccountStatus> {
  return api.get<AccountStatus>('/stripe/connect/account-status');
}

export function getPayoutBalance(): Promise<PayoutBalance> {
  return api.get<PayoutBalance>('/stripe/connect/payout-balance');
}

/** Creates the Express account if needed and returns a hosted onboarding URL. */
export function startHostedOnboarding(input: { email?: string; businessUrl?: string }): Promise<{
  url: string;
  expiresAt: number;
  stripeAccountId: string;
}> {
  return api.post('/stripe/connect/start-hosted-onboarding', input);
}

/** Fresh onboarding/update link for an existing account (expires in ~5 min). */
export function createAccountLink(): Promise<{ url: string; expiresAt: number }> {
  return api.post('/stripe/connect/create-account-link', {});
}

// ── Card payments (PaymentSheet) ─────────────────────────────────────

export interface ChargeInput {
  /** Integer cents. */
  amount: number;
  description?: string;
  metadata?: Record<string, string>;
  /** One UUID per checkout attempt — a retried request returns the same intent. */
  idempotencyKey?: string;
}

export interface CardIntent {
  clientSecret: string;
  ephemeralKey: string;
  customerId: string;
  publishableKey: string;
  stripeAccountId: string;
  paymentIntentId: string;
}

export interface PaymentStatusResult {
  paymentStatus: string;
  amount: number;
  currency: string;
  cardBrand: string | null;
  cardLast4: string | null;
}

export function createPaymentIntent(input: ChargeInput): Promise<CardIntent> {
  return api.post<CardIntent>('/stripe/payments/create-intent', input);
}

export function confirmPaymentStatus(paymentIntentId: string): Promise<PaymentStatusResult> {
  return api.post<PaymentStatusResult>('/stripe/payments/confirm-status', { paymentIntentId });
}

// ── Terminal (Tap to Pay) ────────────────────────────────────────────

export interface TerminalLocationAddress {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  /** ISO 3166-1 alpha-2, e.g. "US". */
  country: string;
}

export interface TerminalLocation {
  id: string;
  displayName: string;
  address: TerminalLocationAddress | null;
}

export async function createConnectionToken(): Promise<string> {
  const { secret } = await api.post<{ secret: string }>('/stripe/payments/terminal/connection-token', {});
  return secret;
}

export async function listTerminalLocations(): Promise<TerminalLocation[]> {
  const { locations } = await api.get<{ locations: TerminalLocation[] }>('/stripe/payments/terminal/locations');
  return locations ?? [];
}

export async function createTerminalLocation(input: {
  displayName: string;
  address: TerminalLocationAddress;
}): Promise<TerminalLocation> {
  const { location } = await api.post<{ location: TerminalLocation }>('/stripe/payments/terminal/locations', input);
  return location;
}

export function createTerminalIntent(input: ChargeInput): Promise<{ clientSecret: string; paymentIntentId: string }> {
  return api.post('/stripe/payments/terminal/create-intent', input);
}

export function captureTerminalPayment(paymentIntentId: string): Promise<PaymentStatusResult> {
  return api.post<PaymentStatusResult>('/stripe/payments/terminal/capture', { paymentIntentId });
}
