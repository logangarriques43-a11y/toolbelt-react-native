# ToolBelt in the browser (app.toolbelt.tools)

The web app is this same Expo codebase compiled with react-native-web. Owners
sign in with the same Firebase accounts and hit the same backend as the iOS and
Android apps, so a business set up in the browser is there when they install
the app, and vice versa.

## How the browser build differs

Metro picks `name.web.ts(x)` over `name.ts(x)` in the web build only, so the
phone apps never load browser code. Every phone-only feature is swapped at one
of these seams:

| Phone feature | Browser replacement |
| --- | --- |
| Stripe PaymentSheet (`lib/stripe-charge.ts`) | Stripe Payment Element in a dialog (`components/web/stripe-form-host.tsx`, `lib/stripe-charge.web.ts`) |
| Tap to Pay (`lib/stripe-terminal.tsx`) | Hidden (`TAP_TO_PAY_SUPPORTED`). Needs phone NFC. |
| AI Texting via Google Play / RevenueCat | Stripe subscription with a 14-day free trial (`components/sms/ai-sms-paywall.web.tsx`, `api/sms-subscription.ts`). Manage/cancel via the Stripe portal (`lib/billing-portal.ts`). |
| `Alert.alert` (a no-op in react-native-web) | Themed in-page dialog (`components/web/alert-host.tsx`) |
| `Share.share` | File download for exports, system share sheet or clipboard for links (`components/web/share-shim.ts`) |
| `router.back()` with an empty history (after a refresh) | Falls back to the dashboard (`components/web/router-back-shim.ts`) |
| reCAPTCHA WebView for SMS sign-in codes | Firebase's own invisible reCAPTCHA (`components/auth/recaptcha-verifier-sheet.web.tsx`) |
| Firebase Auth AsyncStorage persistence | IndexedDB persistence (`lib/firebase-web-auth.web.ts`) |
| Native date picker | Browser date input (`components/sheets/date-picker-sheet.web.tsx`) |
| Swipe-to-delete rows | Swipe still works on touch; mouse users get a hover delete button with a confirm (`components/hover-delete.web.tsx`) |
| Device photos (file system) | Downscaled data URLs in localStorage (`lib/local-photo-files.web.ts`). Still on-device only. |
| Picked file reading (import) | `File.text()` (`lib/read-text-file.web.ts`) |
| Contacts picker | Contact Picker API where it exists (Chrome on Android), otherwise hidden (`CONTACT_PICKER_SUPPORTED`) |
| Device calendar import | Hidden. Use the .ics import instead. |
| Barcode camera scanner | Text field that also accepts USB/Bluetooth scanners (`components/inventory/barcode-scanner.web.tsx`) |
| Passkeys | Hidden (`PASSKEYS_OFFERED`). The backend's relying-party id is the API host, which a browser on app.toolbelt.tools can't use. Moving it would orphan existing app passkeys, so that needs its own migration. |
| Stripe Connect payout setup | Same-tab redirect to Stripe. The backend sends web users back to `/payout` (`client: 'web'`). |

Capability flags live in `src/lib/platform.ts`. `public/index.html` is the
HTML shell: home-screen install metadata and the window-size rules below.

### Window sizes

| Window | Layout |
| --- | --- |
| Under 641px (phones) | The phone layout, full width. |
| 641–1023px (tablets, half-screen windows) | The phone layout in a centered 640px column. Sheets are pinned to the column. |
| 1024px and wider (computers) | Desktop layout: a sidebar with every area, "New appointment" and the account (`components/desktop-shell.web.tsx`). Home is two columns and the calendar opens on the week, with ← / → / Today buttons and the same keyboard keys. Other screens, laid out for a phone, sit in a centered 880px column. Full-screen sheets open as a centered panel over a dimmed window; bottom sheets stay in a centered column with matching dim, and clicking beside them closes them (`components/web/modal-frame.ts`). Sign-in screens sit in a 520px column. |

`useIsDesktop()` (`lib/use-desktop*.ts`) is always `false` in the phone apps,
so the desktop branches never run there. Grids that size themselves from the
width use `useContentWidth()` (`lib/content-width.ts`), which is the window on
phones and the measured screen area in the browser. The sidebar and the phone
dashboard's Workspace list share `lib/workspace-nav.ts`.

Signups report `signupSource` (platform, plus the `?ref=` / `utm_*` tags of the
link that brought a web visitor) to `POST /onboarding/save`. The backend emails
the team and counts the funnel. See `lib/signup-source*.ts`.

## Run it locally

```bash
npx expo start --web
```

The backend only accepts browser requests from approved origins, so
`localhost` is refused. To test against production, point
`EXPO_PUBLIC_API_BASE_URL` (in a git-ignored `.env.local`) at a local relay
that forwards to the API without an Origin header. Never commit that.

Check the phone builds still bundle after web changes:

```bash
npx expo export --platform android --platform ios --output-dir /tmp/native-check
```

## Deploy (Render static site, free)

1. Render → New → Blueprint → this repo. `render.yaml` defines the
   `toolbelt-web` static site: build command, SPA rewrite, security headers
   (CSP, HSTS, etc.) and caching.
2. Fill in the `EXPO_PUBLIC_FIREBASE_*` values when prompted. They are the same
   as in the Android `.env` and are public by design.
3. Settings → Custom Domains → add `app.toolbelt.tools`. In Cloudflare DNS add
   `CNAME app → <the service>.onrender.com`, set to **DNS only** (grey cloud)
   so Render can issue the certificate.
4. Firebase console → Authentication → Settings → Authorized domains → add
   `app.toolbelt.tools`. Sign-in and SMS codes fail without it.
5. Recommended: Firebase console → Project settings → Add app → Web, and use
   that web app's `apiKey` / `appId` for the `EXPO_PUBLIC_FIREBASE_*` values,
   instead of reusing the Android key. Then in Google Cloud → APIs & Services
   → Credentials, restrict that browser key to HTTP referrer
   `https://app.toolbelt.tools/*`. Same Firebase project, so same accounts.

The TestFlight how-to video is `public/media/testflight-howto.mp4` (poster
`.jpg` beside it), served at `app.toolbelt.tools/media/…` and embedded by the
backend's `toolbelt.tools/start` page. To change it, edit
`video/testflight-howto.html` and re-render:

```bash
node video/render.mjs /tmp/frames 30
```

```bash
swift video/encode.swift /tmp/frames public/media/testflight-howto.mp4 30
```

## Known limits (phase 2)

- On a computer, screens other than Home and Calendar keep their phone layout
  in a centered column. Multi-column versions of the lists (clients, invoices)
  are future work.
- Inventory, vending, tattoo, accounting extras and Plaid load and work through
  the same screens, but were not part of the phase-1 browser pass.
- The JS bundle is ~4.5 MB before compression (Render serves it compressed).
  Route-level code splitting would speed up the first visit.
