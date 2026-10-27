/**
 * Card charges via Stripe PaymentSheet — the RN counterpart to the Swift
 * PaymentService card flow. `useCardCharge()` returns a `charge()` that:
 *
 *   POST /stripe/payments/create-intent (integer cents, idempotency UUID)
 *   → initStripe({ publishableKey, stripeAccountId }) for the connected account
 *   → initPaymentSheet → presentPaymentSheet
 *   → POST /stripe/payments/confirm-status for the card brand / last 4.
 *
 * It resolves to the charge details, or `null` when the customer cancelled the
 * sheet; any other failure throws (show it with `alertChargeError`). Also holds
 * the shared result type + error alert used by the Tap to Pay flow.
 */

import { initPaymentSheet, initStripe, PaymentSheetError, presentPaymentSheet } from '@stripe/stripe-react-native';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { confirmPaymentStatus, createPaymentIntent } from '@/api/stripe';
import { ApiError } from '@/lib/api-client';
import { uuid } from '@/lib/id';

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

export function useCardCharge() {
  return useCallback(async ({ amount, description }: ChargeRequest): Promise<ChargeResult | null> => {
    assertChargeable(amount);
    const intent = await createPaymentIntent({
      amount: toCents(amount),
      description,
      idempotencyKey: uuid(),
    });

    await initStripe({
      publishableKey: intent.publishableKey,
      stripeAccountId: intent.stripeAccountId,
      urlScheme: 'toolbelt',
    });

    const init = await initPaymentSheet({
      paymentIntentClientSecret: intent.clientSecret,
      customerId: intent.customerId,
      customerEphemeralKeySecret: intent.ephemeralKey,
      merchantDisplayName: 'ToolBelt',
      returnURL: 'toolbelt://stripe/payment-complete',
    });
    if (init.error) throw new Error(init.error.message);

    const presented = await presentPaymentSheet();
    if (presented.error) {
      if (presented.error.code === PaymentSheetError.Canceled) return null;
      throw new Error(presented.error.message);
    }

    // The charge succeeded; brand/last4 are best-effort display details.
    const status = await confirmPaymentStatus(intent.paymentIntentId).catch(() => null);
    return {
      paymentIntentId: intent.paymentIntentId,
      paymentStatus: 'succeeded',
      cardBrand: status?.cardBrand ?? undefined,
      cardLast4: status?.cardLast4 ?? undefined,
    };
  }, []);
}
