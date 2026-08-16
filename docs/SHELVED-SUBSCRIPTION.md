# Shelved: in-app subscription (Google Play Billing)

**Status:** shelved for launch. The app ships with **everything free and no
in-app subscription**, matching the iOS app (which gates nothing and has no
functional subscription). Nothing subscription-related is imported or executed.

When we build **real** subscriptions on **both** platforms, restore from here.

## Where the full implementation lives (git)

The complete Google Play Billing client (react-native-iap) was implemented and
then reverted. Recover it from:

- **Commit `adbbd28`** — "Subscription: Google Play Billing in-house (react-native-iap)"
  - `src/lib/iap.ts` — react-native-iap v16 boundary (connect, fetch price/offer,
    requestPurchase, restore, finishTransaction, listeners, deep-link to the
    Play subscriptions center).
  - `src/api/subscription.ts` — `getEntitlement()` (`GET /subscription`) +
    `validatePurchase()` (`POST /subscription/validate`).
  - `src/context/subscription.tsx` — `SubscriptionProvider` + `useSubscription()`
    (purchase flow → backend verify+acknowledge → finish → refetch entitlement).
  - `src/app/(app)/settings/subscription.tsx` — the state-driven subscribe /
    active+manage / restore screen (this file is now a plain info screen).
  - Root layout mounted `<SubscriptionProvider>`; the Settings row showed live
    status. Both reverted.

- An **earlier RevenueCat draft** (before we switched to react-native-iap) is in
  commit `adbbd28`'s parent history if needed, but react-native-iap is the
  chosen path.

Restore roughly with: `git checkout adbbd28 -- src/lib/iap.ts src/api/subscription.ts src/context/subscription.tsx`
then re-add `react-native-iap`, re-mount the provider, and restore the screen +
Settings row.

## Backend (reference only — never deployed)

The server-side pieces were **drafted in chat only** and never committed/deployed:

- `requirePro` gating middleware (`ENFORCE_SUBSCRIPTION` kill-switch, reads a
  unified `subscriptions/{businessId}` entitlement doc).
- `POST /subscription/validate` — verify a Play purchase token via the Play
  Developer API, **acknowledge** it (3-day auto-refund guard), persist.
- `POST /webhooks/play` — Google Cloud Pub/Sub RTDN handler (renew/cancel/
  expire/grace) that re-derives and persists entitlement.
- `GET /subscription` — entitlement endpoint the app reads.
- Pub/Sub + Play Console setup (topic, service accounts, push subscription).

**Do not deploy any of it yet.** `ENFORCE_SUBSCRIPTION` stays off/unset and
`requirePro` is applied to **no routes** — so the backend gates nothing on
either platform (parity with iOS).

## Key decisions to remember when we resume

- **Two stores, one entitlement:** Apple (StoreKit — required on iOS) and Google
  Play Billing (Android). Neither can use Stripe for the *app* subscription.
  Stripe stays **merchant-only** (charging the merchant's customers).
- **Unify on `subscriptions/{businessId}`** (there is no `businesses` collection).
  Both stores' server-side validation must write that one doc; `requirePro` reads
  only it, store-agnostic.
- **iOS is net-new:** it has no StoreKit purchase and no server-side receipt
  validation today. To gate anything, iOS needs StoreKit 2 + App Store Server
  Notifications V2 writing the same `subscriptions/{businessId}` doc, added
  alongside the Android path — then flip `ENFORCE_SUBSCRIPTION` for both.
- **Don't advertise an in-app subscription** in the UI until it's real (Play
  monetization policy) — hence the current no-price "Plan & Features" screen.
