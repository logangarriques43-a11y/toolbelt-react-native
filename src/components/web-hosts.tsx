/**
 * Browser-only overlay hosts (alert dialogs, the Stripe card form). Phones use
 * the native Alert / PaymentSheet, so this renders nothing there; see
 * `web-hosts.web.tsx` for the browser build.
 */

export function WebHosts() {
  return null;
}
