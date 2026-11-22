/**
 * AiSmsPaywall in the browser — AI Texting plans bought through Stripe.
 *
 * Same props and look as the Google Play paywall (`ai-sms-paywall.tsx`, via
 * the shared `AiSmsPaywallView`). Plans and prices come from the backend's
 * PLAN_TIERS (never hardcoded here). First-time buyers start a 14-day free
 * trial (card saved now, first charge when the trial ends); returning buyers
 * pay the first month in Stripe's Payment Element. The backend provisions the
 * number from Stripe's webhook; we poll until it's ready and hand the number
 * to `onUnlocked`, or call `onPurchasePending` if it's still being set up.
 */

import { sendEmailVerification } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  cancelIncompleteSubscription,
  createSubscriptionIntent,
  createTrialSetupIntent,
  getSubscriptionStatus,
  getTrialEligibility,
  startTrial,
  type TrialEligibility,
} from '@/api/sms-subscription';
import { AiSmsPaywallView } from '@/components/sms/ai-sms-paywall-view';
import { presentStripeForm } from '@/components/web/stripe-form-host';
import { useSession } from '@/context/session';
import { ApiError, errorMessage } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import { fullMoney } from '@/lib/compact-money';
import { uuid } from '@/lib/id';

const POLL_ATTEMPTS = 12;
const POLL_DELAY_MS = 2500;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function AiSmsPaywall({
  onUnlocked,
  onPurchasePending,
  areaCode,
}: {
  onUnlocked?: (phoneNumber?: string) => void;
  onPurchasePending?: () => void;
  areaCode?: string;
}) {
  const { account } = useSession();
  const [offer, setOffer] = useState<TrialEligibility | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    getTrialEligibility()
      .then((o) => {
        if (!mounted.current) return;
        const tiers = [...o.tiers].sort((a, b) => a.priceCents - b.priceCents);
        setOffer({ ...o, tiers });
        if (tiers.length > 0) setSelected(tiers[0].id);
      })
      .catch((err) => {
        console.warn('[ai-sms-paywall] plans failed to load', err);
        if (mounted.current) setLoadFailed(true);
      });
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Wait for the webhook to provision the number. */
  const waitForNumber = useCallback(
    async (subscriptionId: string) => {
      for (let i = 0; i < POLL_ATTEMPTS && mounted.current; i++) {
        const s = await getSubscriptionStatus(subscriptionId);
        if (s.status === 'provisioned' && s.phoneNumber) return onUnlocked?.(s.phoneNumber);
        if (s.status === 'failed') {
          Alert.alert(
            'Your plan is active',
            "We couldn't finish setting up your number. Please contact support and we'll sort it out right away.",
          );
          return onPurchasePending?.();
        }
        await delay(POLL_DELAY_MS);
      }
      if (mounted.current) onPurchasePending?.();
    },
    [onUnlocked, onPurchasePending],
  );

  /**
   * The free trial needs a verified email (abuse guard on the backend). Re-read
   * the account first, since they may have just clicked the link, and refresh the
   * ID token so the server sees the new `email_verified` claim. Otherwise offer
   * to resend the email.
   */
  const ensureVerifiedEmail = async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    if (!user.emailVerified) await user.reload();
    if (auth.currentUser?.emailVerified) {
      await auth.currentUser.getIdToken(true);
      return true;
    }
    promptToVerify();
    return false;
  };

  const promptToVerify = () => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert(
      'Verify your email first',
      `To start the free trial, open the verification email we sent to ${user.email ?? 'your inbox'}, tap the link, then come back and try again.`,
      [
        { text: 'OK', style: 'cancel' },
        {
          text: 'Resend email',
          onPress: () =>
            sendEmailVerification(user).then(
              () => Alert.alert('Email sent', 'Check your inbox (and spam folder) for the verification link.'),
              (err) => Alert.alert("Couldn't send the email", errorMessage(err, 'Please try again in a minute.')),
            ),
        },
      ],
    );
  };

  /** The backend's trial refusals carry a `code`; each gets its own next step. */
  const handleTrialRefusal = (err: unknown): boolean => {
    const code = err instanceof ApiError ? err.code : undefined;
    switch (code) {
      case 'EMAIL_UNVERIFIED':
        promptToVerify();
        return true;
      case 'TRIAL_USED':
      case 'NOT_ELIGIBLE':
        // Show the regular paid plans instead of the trial.
        setOffer((o) => (o ? { ...o, eligible: false } : o));
        Alert.alert('Free trial not available', `${errorMessage(err, '')} You can still subscribe below.`);
        return true;
      case 'TRIAL_RETRY':
        Alert.alert('Please try again', 'Something went wrong starting your trial. Tap Start Free Trial to enter your card again.');
        return true;
      default:
        // CARD_USED, PREPAID_CARD, CARD_UNSUPPORTED, SETUP_LIMIT: the server's message says what to do.
        return false;
    }
  };

  const subscribe = async () => {
    const tier = offer?.tiers.find((t) => t.id === selected);
    if (!offer || !tier || purchasing) return;
    setPurchasing(true);
    const base = {
      tier: tier.id,
      areaCode,
      businessName: account?.businessName,
      idempotencyKey: uuid(),
    };
    try {
      if (offer.eligible) {
        if (!(await ensureVerifiedEmail())) return;
        const setup = await createTrialSetupIntent(base);
        const saved = await presentStripeForm({
          publishableKey: setup.publishableKey,
          clientSecret: setup.clientSecret,
          mode: 'setup',
          title: 'Start Free Trial',
          subtitle: `${tier.name}: free for ${setup.trialDays} days, then ${fullMoney(tier.priceCents / 100)}/month. Cancel anytime.`,
          submitLabel: 'Start Free Trial',
        });
        if (saved.status === 'cancelled') return;
        const { subscriptionId } = await startTrial({ ...base, setupIntentId: saved.intentId });
        await waitForNumber(subscriptionId);
      } else {
        const intent = await createSubscriptionIntent(base);
        if (intent.requiresPayment) {
          const paid = await presentStripeForm({
            publishableKey: intent.publishableKey,
            clientSecret: intent.clientSecret,
            mode: 'payment',
            title: 'Subscribe',
            subtitle: `${tier.name}: ${fullMoney(tier.priceCents / 100)}/month. Cancel anytime.`,
            submitLabel: `Pay ${fullMoney(tier.priceCents / 100)}`,
          });
          if (paid.status === 'cancelled') {
            // Never-paid subscriptions expire on their own; this just tidies up now.
            cancelIncompleteSubscription(intent.subscriptionId).catch((err) =>
              console.warn('[ai-sms-paywall] cancel of abandoned subscription failed', err),
            );
            return;
          }
        }
        await waitForNumber(intent.subscriptionId);
      }
    } catch (err) {
      if (handleTrialRefusal(err)) return;
      Alert.alert("Couldn't complete purchase", errorMessage(err, 'Something went wrong. Please try again.'));
    } finally {
      if (mounted.current) setPurchasing(false);
    }
  };

  const trialDays = offer?.trialDays ?? 14;
  return (
    <AiSmsPaywallView
      plans={
        loadFailed
          ? []
          : offer?.tiers.map((t) => ({ id: t.id, name: t.name, priceString: fullMoney(t.priceCents / 100) })) ?? null
      }
      selected={selected}
      onSelect={setSelected}
      onSubscribe={subscribe}
      purchasing={purchasing}
      ctaTitle={offer?.eligible ? 'Start Free Trial' : 'Subscribe'}
      highlight={offer?.eligible ? `Try it free for ${trialDays} days. You won't be charged until day ${trialDays + 1}.` : undefined}
      finePrint={
        offer?.eligible
          ? `Billed monthly by card after your ${trialDays}-day free trial. Cancel anytime before then and you won't be charged.`
          : 'Billed monthly by card. Cancel anytime.'
      }
    />
  );
}
