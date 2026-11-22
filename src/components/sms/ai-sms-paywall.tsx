/**
 * AiSmsPaywall — the AI SMS plan selector (RevenueCat / Google Play).
 *
 * Fetches the "default" offering, lists its four packages (starter/growth/pro/
 * ultimate) cheapest-first, and runs a Google Play purchase on selection. Shown
 * by the AI Texting gate when the `ai_sms` entitlement isn't active. Matches the
 * app's AI Texting look (filled hero tile, feature card, accent CTA), drawn by
 * the shared `AiSmsPaywallView`. The browser build uses `ai-sms-paywall.web.tsx`.
 *
 * Never shows a purchasable paywall without real prices: if plans can't load
 * (incl. Expo Go / non-Android), it shows an unavailable state instead — the
 * same rule the iOS paywall follows. Booking limits are intentionally not shown
 * (they live in the backend PLAN_TIERS table; not hardcoded here).
 */

import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { AiSmsPaywallView } from '@/components/sms/ai-sms-paywall-view';
import { fetchAiSmsPlans, purchaseAiSmsPlan, type AiSmsPlan } from '@/lib/ai-sms-billing';

/**
 * `onUnlocked` runs after a purchase that shows the entitlement at once.
 * `onPurchasePending` runs when Play took the payment but RevenueCat hasn't
 * reported the entitlement yet; without it the paywall just says so.
 */
export function AiSmsPaywall({
  onUnlocked,
  onPurchasePending,
}: {
  /** The browser paywall passes the provisioned number; this one never does. */
  onUnlocked?: (phoneNumber?: string) => void;
  onPurchasePending?: () => void;
  /** Area code chosen in setup (used by the browser paywall; ignored here). */
  areaCode?: string;
}) {
  const [plans, setPlans] = useState<AiSmsPlan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAiSmsPlans().then((p) => {
      if (!active) return;
      setPlans(p);
      if (p.length > 0) setSelected(p[0].packageId); // default to cheapest
    });
    return () => {
      active = false;
    };
  }, []);

  const buy = async () => {
    const plan = plans?.find((p) => p.packageId === selected);
    if (!plan || purchasing) return;
    setPurchasing(true);
    const result = await purchaseAiSmsPlan(plan);
    setPurchasing(false);
    if (result.status === 'entitled') {
      onUnlocked?.();
    } else if (result.status === 'purchased-not-entitled' && onPurchasePending) {
      onPurchasePending();
    } else if (result.status === 'purchased-not-entitled') {
      Alert.alert('Purchase received', 'Your plan is being activated. This can take a moment — pull back in shortly.');
    } else if (result.status === 'error') {
      Alert.alert("Couldn't complete purchase", result.message);
    }
    // 'cancelled' / 'unavailable' → no alert
  };

  return (
    <AiSmsPaywallView
      plans={plans?.map((p) => ({ id: p.packageId, name: p.name, priceString: p.priceString })) ?? null}
      selected={selected}
      onSelect={setSelected}
      onSubscribe={buy}
      purchasing={purchasing}
      ctaTitle="Subscribe"
      finePrint="Billed monthly through Google Play. Cancel anytime in Google Play › Subscriptions."
    />
  );
}
