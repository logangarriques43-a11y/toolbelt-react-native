/**
 * Card-charge helpers shared by the native PaymentSheet flow
 * (`stripe-charge.ts`) and the browser Payment Element flow
 * (`stripe-charge.web.ts`): the result type, cents conversion, the sale fields
 * a charge records, and the payout-setup error alert. Also used by Tap to Pay.
 */

import { Alert } from 'react-native';

import { confirmPaymentStatus } from '@/api/stripe';
import { ApiError } from '@/lib/api-client';

/** Minimum Stripe charge in cents. */
export const MIN_CHARGE_CENTS = 50;

/** What a successful card / Tap to Pay charge records on the sale. */
export interface ChargeResult {
  paymentIntentId: string;
  paymentStatus: string;
  cardBrand?: string;
  cardLast4?: string;
}

export interface ChargeRequest {
  /** Grand total in dollars; converted to integer cents here. */
  amount: number;
  description?: string;
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Sale fields for a charged sale (spread into `addSale`). */
export function saleFieldsFor(result: ChargeResult) {
  return {
    paymentTransactionId: result.paymentIntentId,
    paymentProviderRef: result.paymentIntentId,
    paymentStatus: result.paymentStatus,
    cardBrand: result.cardBrand,
    cardLast4: result.cardLast4,
  };
}

/** True for the backend's "no charges-enabled Connect account" 400s. */
export function isPayoutSetupError(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 400 &&
    /Stripe Connect account|enabled for charges/i.test(err.message)
  );
}

/**
 * Alert for a failed charge. When the business hasn't finished payouts, offer
 * "Set Up Payouts" (the caller closes any sheet and routes to /payout).
 */
export function alertChargeError(err: unknown, onSetUpPayouts?: () => void) {
  if (isPayoutSetupError(err)) {
    Alert.alert('Set up payouts first', (err as ApiError).message, [
      { text: 'Not Now', style: 'cancel' },
      ...(onSetUpPayouts ? [{ text: 'Set Up Payouts', onPress: onSetUpPayouts }] : []),
    ]);
    return;
  }
  const message =
    err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.';
  Alert.alert('Payment failed', message);
}

/** Below Stripe's minimum → a friendly error before any network call. */
export function assertChargeable(amount: number) {
  if (toCents(amount) < MIN_CHARGE_CENTS) {
    throw new Error('Card payments must be at least $0.50.');
  }
}

/**
 * The result to record for a card charge that succeeded. Brand / last 4 are
 * best-effort display details read back from the server; a failed lookup
 * still records the (successful) charge.
 */
export async function succeededChargeResult(paymentIntentId: string): Promise<ChargeResult> {
  const status = await confirmPaymentStatus(paymentIntentId).catch(() => null);
  return {
    paymentIntentId,
    paymentStatus: 'succeeded',
    cardBrand: status?.cardBrand ?? undefined,
    cardLast4: status?.cardLast4 ?? undefined,
  };
}
