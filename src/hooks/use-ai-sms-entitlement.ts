/**
 * useAiSmsEntitlement — whether the AI SMS feature is unlocked.
 *
 * Reads the RevenueCat `ai_sms` entitlement from customerInfo and stays live
 * via the customer-info update listener (so a purchase or a cross-device change
 * flips the gate without a manual refresh). When purchases aren't available
 * (Expo Go / non-Android / no key), `available` is false and `entitled` stays
 * false — the gate then shows the paywall's unavailable state.
 */

import { useEffect, useState } from 'react';

import { PURCHASES_AVAILABLE } from '@/config/revenuecat';
import { addCustomerInfoListener, getCustomerInfo, isAiSmsActive } from '@/lib/ai-sms-billing';

export function useAiSmsEntitlement(): { entitled: boolean; loading: boolean; available: boolean } {
  const [entitled, setEntitled] = useState(false);
  const [loading, setLoading] = useState(PURCHASES_AVAILABLE);

  useEffect(() => {
    if (!PURCHASES_AVAILABLE) return;
    let active = true;

    getCustomerInfo().then((info) => {
      if (!active) return;
      setEntitled(isAiSmsActive(info));
      setLoading(false);
    });

    const remove = addCustomerInfoListener((info) => setEntitled(isAiSmsActive(info)));
    return () => {
      active = false;
      remove();
    };
  }, []);

  return { entitled, loading, available: PURCHASES_AVAILABLE };
}
