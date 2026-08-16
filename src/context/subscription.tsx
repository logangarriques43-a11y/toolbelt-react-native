/**
 * Subscription store — ToolBelt Pro via Google Play Billing (react-native-iap),
 * verified in-house (no third party).
 *
 * Entitlement (isPro / willRenew / expiry) is read from OUR backend
 * (`GET /subscription`), which is the source of truth kept current by Play
 * RTDN. The store owns the purchase FLOW: it connects to Play, launches the
 * purchase sheet, hands the resulting purchaseToken to the backend to
 * verify + acknowledge (`POST /subscription/validate`), finishes the local
 * transaction, then refetches the entitlement.
 *
 * ── Backend contract (partner) ────────────────────────────────────────────
 * POST /subscription/validate  { purchaseToken, productId, packageName, platform }
 *   → Play Developer API purchases.subscriptionsv2.get to validate the token;
 *     ACKNOWLEDGE it (Google auto-refunds if not acknowledged within 3 days);
 *     bind purchaseToken → exactly one businessId; store the entitlement;
 *     return the Entitlement.
 * POST /webhooks/play          (Google Cloud Pub/Sub push, verified)
 *   → on SUBSCRIPTION_RENEWED / CANCELED / EXPIRED / ON_HOLD / IN_GRACE_PERIOD /
 *     RECOVERED / REVOKED, look up by purchaseToken and grant/revoke.
 * GET  /subscription           → { active, plan, status, currentPeriodEnd, willRenew }
 *   (source of truth for the app + server-side feature gating). Never trust a
 *   client-reported "active".
 *
 * In Expo Go / non-Android the purchase flow is unavailable (available:false);
 * the entitlement can still be read so an existing subscriber shows as active.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { getEntitlement, validatePurchase, type Entitlement } from '@/api/subscription';
import { useSession } from '@/context/session';
import {
  IAP_AVAILABLE,
  PRO_PRODUCT_ID,
  addPurchaseListeners,
  connect,
  disconnect,
  fetchProOffer,
  finishPurchase,
  listOwnedPurchases,
  openManageSubscriptions,
  requestProPurchase,
} from '@/lib/iap';

export const SUBSCRIPTION_QUERY_KEY = ['subscription'] as const;

export type PurchaseResult =
  | { status: 'purchased' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export interface SubscriptionStore {
  available: boolean;
  isLoading: boolean;
  isPro: boolean;
  willRenew: boolean;
  expirationDate: string | null;
  priceString: string;
  purchasing: boolean;
  purchase: () => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  openManage: () => void;
}

const SubscriptionContext = createContext<SubscriptionStore | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { account } = useSession();
  const signedIn = !!account;

  const [offer, setOffer] = useState<{ price: string; offerToken?: string }>({ price: '$15.00' });
  const [purchasing, setPurchasing] = useState(false);
  const pending = useRef<((r: PurchaseResult) => void) | null>(null);

  const entQuery = useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: getEntitlement,
    enabled: signedIn,
  });

  // Connect to Play, load the price/offer, and wire purchase-result listeners.
  useEffect(() => {
    if (!IAP_AVAILABLE) return;
    let removeListeners = () => {};
    (async () => {
      try {
        await connect();
      } catch {
        // connection failure — purchase will surface an error when attempted
      }
      setOffer(await fetchProOffer());
      removeListeners = addPurchaseListeners(
        async (p) => {
          try {
            const ent = await validatePurchase({ purchaseToken: p.purchaseToken, productId: p.productId });
            qc.setQueryData(SUBSCRIPTION_QUERY_KEY, ent);
            await finishPurchase(p.raw);
            pending.current?.({ status: 'purchased' });
          } catch (e) {
            pending.current?.({ status: 'error', message: (e as Error)?.message ?? 'Verification failed.' });
          } finally {
            pending.current = null;
            setPurchasing(false);
            qc.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
          }
        },
        (err) => {
          pending.current?.(err.userCancelled ? { status: 'cancelled' } : { status: 'error', message: err.message });
          pending.current = null;
          setPurchasing(false);
        },
      );
    })();
    return () => {
      removeListeners();
      disconnect().catch(() => {});
    };
  }, [qc]);

  const value = useMemo<SubscriptionStore>(() => {
    const ent: Entitlement = entQuery.data ?? { active: false };

    const purchase = (): Promise<PurchaseResult> => {
      if (!IAP_AVAILABLE) return Promise.resolve({ status: 'unavailable' });
      setPurchasing(true);
      return new Promise<PurchaseResult>((resolve) => {
        pending.current = resolve;
        requestProPurchase(offer.offerToken).catch((e) => {
          pending.current?.({ status: 'error', message: (e as Error)?.message ?? 'Could not start purchase.' });
          pending.current = null;
          setPurchasing(false);
        });
      });
    };

    const restore = async (): Promise<PurchaseResult> => {
      if (!IAP_AVAILABLE) return { status: 'unavailable' };
      try {
        const owned = await listOwnedPurchases();
        const pro = owned.find((p) => p.productId === PRO_PRODUCT_ID) ?? owned[0];
        if (!pro) return { status: 'error', message: 'No active subscription found to restore.' };
        const ent2 = await validatePurchase({ purchaseToken: pro.purchaseToken, productId: pro.productId });
        qc.setQueryData(SUBSCRIPTION_QUERY_KEY, ent2);
        qc.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEY });
        return ent2.active ? { status: 'purchased' } : { status: 'error', message: 'No active subscription found to restore.' };
      } catch (e) {
        return { status: 'error', message: (e as Error)?.message ?? 'Restore failed.' };
      }
    };

    return {
      available: IAP_AVAILABLE,
      isLoading: signedIn && entQuery.isLoading,
      isPro: ent.active,
      willRenew: ent.willRenew ?? false,
      expirationDate: ent.currentPeriodEnd ?? null,
      priceString: offer.price,
      purchasing,
      purchase,
      restore,
      openManage: () => {
        openManageSubscriptions();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entQuery.data, entQuery.isLoading, signedIn, offer, purchasing]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionStore {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return ctx;
}
