/**
 * Browser build: install the web stand-ins for native-only APIs and mount the
 * overlays they draw into. Rendered once from the root layout (inside the
 * theme provider so the dialogs match the app's look).
 *
 * - `Alert.alert` → themed in-page dialog (react-native-web's is a no-op).
 * - `Share.share` → download / system share / clipboard.
 * - Stripe card form used by `stripe-charge.web.ts` and the AI Texting paywall.
 * - `router.back()` falls back to the dashboard after a refresh (empty history).
 * - The landing link's `?ref=` / utm tags are remembered for signup attribution.
 */

import { AlertHost, installWebAlert } from '@/components/web/alert-host';
import { installWebBackFallback } from '@/components/web/router-back-shim';
import { installWebShare } from '@/components/web/share-shim';
import { StripeFormHost } from '@/components/web/stripe-form-host';
import { captureSignupSource } from '@/lib/signup-source';

// Install at import time so alerts raised before the first render are queued.
installWebAlert();
installWebShare();
installWebBackFallback();
// Remember the landing link's ?ref= / utm tags before navigation drops them.
captureSignupSource();

export function WebHosts() {
  return (
    <>
      <StripeFormHost />
      <AlertHost />
    </>
  );
}
