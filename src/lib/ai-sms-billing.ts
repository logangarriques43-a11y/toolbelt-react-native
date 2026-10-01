/**
 * AI SMS billing boundary (RevenueCat / Google Play).
 *
 * The ONLY file that talks to react-native-purchases for the paywall. Its SDK
 * types are version-specific, so the surface is loosely typed here (`as any` at
 * the boundary) and typed cleanly above. No-ops / empty when purchases aren't
 * available (Expo Go / non-Android / no key).
 *
 * Entitlement is read from RevenueCat (customerInfo.entitlements.active[ai_sms]).
 * Booking limits are deliberately NOT surfaced here — they live in the backend
 * PLAN_TIERS table and must not be hardcoded in the client.
 */

import Purchases from 'react-native-purchases';

import { AI_SMS_ENTITLEMENT, AI_SMS_OFFERING, PURCHASES_AVAILABLE } from '@/config/revenuecat';

const anyRC = Purchases as unknown as Record<string, (...args: unknown[]) => any>;

export interface AiSmsPlan {
  /** RevenueCat package identifier (passed back to purchase). */
  packageId: string;
  /** Store product identifier (e.g. the Google Play product id). */
  productId: string;
  /** Localized price string from the store, e.g. "$24.99". */
  priceString: string;
  /** Numeric price for ordering. */
  price: number;
  /** Display name (plan name only — never a hardcoded booking limit). */
  name: string;
  /** The raw RevenueCat package, needed for purchase. */
  raw: unknown;
}

export type PurchaseOutcome =
  | { status: 'entitled' }
  | { status: 'purchased-not-entitled' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

/** Plan name from the product id (name only — not booking limits). */
const TIER_LABELS: { key: string; name: string }[] = [
  { key: 'starter', name: 'Starter' },
  { key: 'growth', name: 'Growth' },
  { key: 'pro', name: 'Pro' },
  { key: 'ultimate', name: 'Ultimate' },
];

function planName(productId: string, fallbackTitle?: string): string {
  const id = productId.toLowerCase();
  const hit = TIER_LABELS.find((t) => id.includes(t.key));
  if (hit) return hit.name;
  // Strip a trailing "(App Name)" the store sometimes appends to titles.
  return (fallbackTitle || productId).replace(/\s*\(.*\)\s*$/, '').trim();
}

export function isAiSmsActive(customerInfo: unknown): boolean {
  const active = (customerInfo as { entitlements?: { active?: Record<string, unknown> } })?.entitlements?.active;
  return !!active && !!active[AI_SMS_ENTITLEMENT];
}

export async function getCustomerInfo(): Promise<unknown | null> {
  if (!PURCHASES_AVAILABLE) return null;
  try {
    return await anyRC.getCustomerInfo();
  } catch {
    return null;
  }
}

/** The four AI SMS plans from the "default" offering, cheapest-first. */
export async function fetchAiSmsPlans(): Promise<AiSmsPlan[]> {
  if (!PURCHASES_AVAILABLE) return [];
  try {
    const offerings = await anyRC.getOfferings();
    const offering = offerings?.all?.[AI_SMS_OFFERING] ?? offerings?.current ?? null;
    const packages: any[] = offering?.availablePackages ?? [];
    return packages
      .map((p) => {
        const product = p.product ?? {};
        const productId: string = product.identifier ?? '';
        return {
          packageId: p.identifier,
          productId,
          priceString: product.priceString ?? '',
          price: typeof product.price === 'number' ? product.price : 0,
          name: planName(productId, product.title),
          raw: p,
        } as AiSmsPlan;
      })
      .sort((a, b) => a.price - b.price);
  } catch {
    return [];
  }
}

export async function purchaseAiSmsPlan(plan: AiSmsPlan): Promise<PurchaseOutcome> {
  if (!PURCHASES_AVAILABLE) return { status: 'unavailable' };
  try {
    const { customerInfo } = await anyRC.purchasePackage(plan.raw);
    return isAiSmsActive(customerInfo)
      ? { status: 'entitled' }
      : { status: 'purchased-not-entitled' };
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) return { status: 'cancelled' };
    return { status: 'error', message: (e as Error)?.message ?? 'Purchase failed.' };
  }
}

export function addCustomerInfoListener(cb: (info: unknown) => void): () => void {
  if (!PURCHASES_AVAILABLE) return () => {};
  anyRC.addCustomerInfoUpdateListener(cb);
  return () => {
    try {
      anyRC.removeCustomerInfoUpdateListener(cb);
    } catch {
      // ignore
    }
  };
}
