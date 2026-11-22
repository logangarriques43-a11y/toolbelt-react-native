/**
 * AI Texting plan purchase through Stripe (platform account) — the path the
 * browser build uses, since Google Play / App Store billing don't exist there.
 * Mirrors the iOS PaymentSheet flow on the backend
 * (`routes/sms/phoneNumberRoutes.js`):
 *
 * - First-time buyers get a 14-day free trial: `/trial/setup-intent` → the card
 *   is saved with Stripe → `/trial/start` creates the trialing subscription.
 * - Returning buyers pay the first month now: `/subscription/create-intent`.
 *
 * Either way the backend provisions the number from Stripe's webhook, and
 * `getSubscriptionStatus` (which also reconciles a late webhook) reports it.
 */

import { api } from '@/lib/api-client';

export interface PlanTier {
  id: string;
  name: string;
  priceCents: number;
  monthlyBookingLimit: number;
}

export interface TrialEligibility {
  eligible: boolean;
  trialDays: number;
  tiers: PlanTier[];
}

export interface StripeSecret {
  clientSecret: string;
  publishableKey: string;
}

export interface TrialSetupIntent extends StripeSecret {
  setupIntentId: string;
  trialDays: number;
}

export type SubscriptionIntent =
  | ({ requiresPayment: true; subscriptionId: string } & StripeSecret)
  | { requiresPayment: false; subscriptionId: string };

export type PurchaseStatus = 'awaiting_payment' | 'provisioning' | 'provisioned' | 'failed';

export interface SubscriptionStatus {
  status: PurchaseStatus;
  phoneNumber: string | null;
}

interface PurchaseInput {
  tier: string;
  areaCode?: string;
  businessName?: string;
  idempotencyKey: string;
}

function cleanInput(input: PurchaseInput) {
  return {
    tier: input.tier,
    idempotencyKey: input.idempotencyKey,
    ...(input.areaCode && /^\d{3}$/.test(input.areaCode) ? { areaCode: input.areaCode } : {}),
    ...(input.businessName?.trim() ? { businessName: input.businessName.trim() } : {}),
  };
}

export function getTrialEligibility(): Promise<TrialEligibility> {
  return api.get<TrialEligibility>('/phone-numbers/subscription/trial/eligibility');
}

export function createTrialSetupIntent(input: PurchaseInput): Promise<TrialSetupIntent> {
  return api.post<TrialSetupIntent>('/phone-numbers/subscription/trial/setup-intent', cleanInput(input));
}

export function startTrial(
  input: PurchaseInput & { setupIntentId: string },
): Promise<{ subscriptionId: string; trialEnd: number | string | null }> {
  return api.post('/phone-numbers/subscription/trial/start', {
    ...cleanInput(input),
    setupIntentId: input.setupIntentId,
  });
}

export function createSubscriptionIntent(input: PurchaseInput): Promise<SubscriptionIntent> {
  return api.post<SubscriptionIntent>('/phone-numbers/subscription/create-intent', cleanInput(input));
}

export async function getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
  const res = await api.get<{ status: PurchaseStatus; phoneNumber?: string | null }>(
    `/phone-numbers/subscription/${encodeURIComponent(subscriptionId)}`,
  );
  return { status: res.status, phoneNumber: res.phoneNumber ?? null };
}

/** Abandoned checkout: cancel a never-paid (incomplete) subscription. */
export async function cancelIncompleteSubscription(subscriptionId: string): Promise<void> {
  await api.post(`/phone-numbers/subscription/${encodeURIComponent(subscriptionId)}/cancel`);
}
