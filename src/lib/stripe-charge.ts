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
 * sheet; any other failure throws (show it with `alertChargeError`). The
 * shared result type + error alert live in `stripe-charge-shared.ts`; the
 * browser build uses `stripe-charge.web.ts` instead of this file.
 */

import { initPaymentSheet, initStripe, PaymentSheetError, presentPaymentSheet } from '@stripe/stripe-react-native';
import { useCallback } from 'react';

import { createPaymentIntent } from '@/api/stripe';
import { uuid } from '@/lib/id';
import {
  assertChargeable,
  succeededChargeResult,
  toCents,
  type ChargeRequest,
  type ChargeResult,
} from '@/lib/stripe-charge-shared';

export * from '@/lib/stripe-charge-shared';

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

    return succeededChargeResult(intent.paymentIntentId);
  }, []);
}
