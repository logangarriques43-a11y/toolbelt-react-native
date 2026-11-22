/**
 * AI SMS billing boundary in the browser: there is no RevenueCat / Google Play
 * here, so this is the "purchases unavailable" side of `ai-sms-billing.ts`
 * (same exports). The browser paywall (`ai-sms-paywall.web.tsx`) buys plans
 * through Stripe instead, and the AI Texting gate unlocks once the business
 * has a number.
 */

export interface AiSmsPlan {
  packageId: string;
  productId: string;
  priceString: string;
  price: number;
  name: string;
  raw: unknown;
}

export type PurchaseOutcome =
  | { status: 'entitled' }
  | { status: 'purchased-not-entitled' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export function isAiSmsActive(_customerInfo: unknown): boolean {
  return false;
}

export async function getCustomerInfo(): Promise<unknown | null> {
  return null;
}

export async function fetchAiSmsPlans(): Promise<AiSmsPlan[]> {
  return [];
}

export async function purchaseAiSmsPlan(_plan: AiSmsPlan): Promise<PurchaseOutcome> {
  return { status: 'unavailable' };
}

export function addCustomerInfoListener(_cb: (info: unknown) => void): () => void {
  return () => {};
}
