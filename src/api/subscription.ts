/**
 * Subscription API — the app reads entitlement from OUR backend (the source of
 * truth, kept current by Play RTDN), and posts new purchase tokens to it for
 * server-side verification + acknowledgment. See the backend contract in
 * src/context/subscription.tsx's header / the plan.
 */

import { api, ApiError } from '@/lib/api-client';
import { PACKAGE_NAME } from '@/lib/iap';

export interface Entitlement {
  /** True when ToolBelt Pro access should be granted. */
  active: boolean;
  plan?: string;
  /** 'active' | 'canceled' | 'in_grace' | 'on_hold' | 'expired' */
  status?: string;
  /** ISO — end of the current paid period / when access lapses. */
  currentPeriodEnd?: string | null;
  /** False once the user has cancelled (still active until currentPeriodEnd). */
  willRenew?: boolean;
}

const NOT_SUBSCRIBED: Entitlement = { active: false };

/**
 * GET /subscription — current entitlement for the signed-in business.
 * A 404 (endpoint not built yet / no record) is treated as "not subscribed"
 * so the UI degrades cleanly; other errors propagate for React Query to handle.
 */
export async function getEntitlement(): Promise<Entitlement> {
  try {
    return await api.get<Entitlement>('/subscription');
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return NOT_SUBSCRIBED;
    throw e;
  }
}

/**
 * POST /subscription/validate — hand a Google Play purchase token to the
 * backend to verify against the Play Developer API, acknowledge, persist, and
 * return the resulting entitlement.
 */
export async function validatePurchase(input: {
  purchaseToken: string;
  productId: string;
}): Promise<Entitlement> {
  return api.post<Entitlement>('/subscription/validate', {
    ...input,
    packageName: PACKAGE_NAME,
    platform: 'android',
  });
}
