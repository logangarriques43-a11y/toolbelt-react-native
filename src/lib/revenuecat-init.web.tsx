/**
 * RevenueCat has no role in the browser build: Google Play / App Store billing
 * doesn't exist on the web, and AI Texting is bought there through Stripe
 * (see `ai-sms-billing.web.ts`). Same export as `revenuecat-init.tsx`.
 */

export function RevenueCatInit() {
  return null;
}
