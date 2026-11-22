/**
 * Card charges in the browser — the web counterpart of `stripe-charge.ts`.
 *
 * Same contract as the native hook: `useCardCharge()` returns a `charge()` that
 * creates the PaymentIntent on the business's Connect account
 * (POST /stripe/payments/create-intent), collects the card in Stripe's Payment
 * Element (`presentStripeForm`) instead of the native PaymentSheet, then reads
 * back the card brand / last 4. Resolves to the charge details, or `null` when
 * the customer cancels.
 */

import { useCallback } from 'react';

import { createPaymentIntent } from '@/api/stripe';
import { presentStripeForm } from '@/components/web/stripe-form-host';
import { fullMoney } from '@/lib/compact-money';
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
      client: 'web',
    });

    const outcome = await presentStripeForm({
      publishableKey: intent.publishableKey,
      stripeAccount: intent.stripeAccountId,
      clientSecret: intent.clientSecret,
      mode: 'payment',
      title: 'Card Payment',
      subtitle: description,
      submitLabel: `Charge ${fullMoney(amount)}`,
    });
    if (outcome.status === 'cancelled') return null;

    return succeededChargeResult(intent.paymentIntentId);
  }, []);
}
