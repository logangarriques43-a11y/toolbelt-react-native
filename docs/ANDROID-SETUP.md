# Android setup checklist

Everything the app needs that can't live in code: keys, console switches, server settings and the
first test pass. Do the sections in order. Each step says who can do it and how to check it worked.

Repos: app = `logangarriques43-a11y/toolbelt-react-native`, server = `davidperezrueda/toolbelt-backend`
(deploys to Render from `main`).

---

## 1. Merge the code

1. **Server fixes** — review and merge
   [toolbelt-backend#373](https://github.com/davidperezrueda/toolbelt-backend/pull/373)
   (Android passkeys, Stripe onboarding return, Tap to Pay fee). Render deploys `main` automatically.
   Check: Render → toolbelt-backend → Events shows a successful deploy of the merge commit.
2. **App** — review and merge
   [toolbelt-react-native#1](https://github.com/logangarriques43-a11y/toolbelt-react-native/pull/1).

## 2. Firebase (link the app)

The app has its own Firebase Android app, **ToolBelt Android** (`tools.toolbelt.app`, app ID
`1:867777580265:android:92ce4ac42ac03db3cdb478`), in the same project as iOS (`toolbelt-b2ef6`), so both apps
share the same users and data. Its config file, `google-services.json`, is committed at the repo root and
wired in through `android.googleServicesFile` in `app.json`. Sign-in itself runs through the Firebase JS SDK
using the values in `.env`.

1. **Local `.env`** — copy `.env.example` to `.env` and fill in:

   ```
   EXPO_PUBLIC_API_BASE_URL=https://api.toolbelt.tools/api/v1
   EXPO_PUBLIC_FIREBASE_API_KEY=<api_key.current_key from google-services.json>
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=toolbelt-b2ef6.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=toolbelt-b2ef6
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=toolbelt-b2ef6.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=867777580265
   EXPO_PUBLIC_FIREBASE_APP_ID=1:867777580265:android:92ce4ac42ac03db3cdb478
   EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<goog_… key from RevenueCat → API keys>
   ```

   (David's Mac already has this file, without the RevenueCat key.)
   Optional: once you have the signing key's SHA-256 (§4), add it in Firebase console → Project settings →
   ToolBelt Android → Add fingerprint. It isn't needed for email sign-in; it is for Google sign-in or App
   Check later.
2. **EAS builds** — `.env` is gitignored, so cloud builds don't see it. Add each line above as an EAS
   environment variable for `development`, `preview` and `production`:

   ```
   eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value <key> --environment development --environment preview --environment production --visibility plaintext
   ```

   (repeat for every `EXPO_PUBLIC_*` line). Check: `eas env:list --environment production`.
3. **Two-step sign-in (authenticator apps)** — TOTP must be switched on for the project. The Firebase
   console only shows SMS, so use Google Cloud Shell (shell.cloud.google.com, signed in as a project owner):

   ```
   gcloud config set project toolbelt-b2ef6
   curl -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/toolbelt-b2ef6/config?updateMask=mfa" \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -H "Content-Type: application/json" -H "X-Goog-User-Project: toolbelt-b2ef6" \
     -d '{"mfa":{"state":"ENABLED","providerConfigs":[{"state":"ENABLED","totpProviderConfig":{"adjacentIntervals":5}}]}}'
   ```

   This needs Firebase Authentication with Identity Platform (Firebase console → Authentication →
   Settings → upgrade, if it isn't already). If SMS 2FA is already enabled for iOS, keep it in the same
   call by adding `"enabledProviders":["PHONE_SMS"]` next to `"state"`. Check: Security → Set Up 2FA on
   Android shows a setup key instead of "isn't enabled".
4. Text-message 2FA can't run on Android with the Firebase JS SDK (it needs a web reCAPTCHA). Android
   users use an authenticator app or a passkey; iOS is unchanged.

## 3. Server settings (Render → toolbelt-backend → Environment)

Check each is set; add the missing ones, then redeploy.

| Variable | Needed for | Where to get it |
|---|---|---|
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Payouts, card checkout, Tap to Pay | Stripe Dashboard → Developers → API keys (live) |
| `ANTHROPIC_API_KEY` | AI helper, AI tax analysis | console.anthropic.com |
| `GOOGLE_PLACES_API_KEY` | Nearby vendor search | Google Cloud → APIs & Services → Credentials (see §5) |
| `POSTMARK_SYSTEM_SERVER_TOKEN`, `POSTMARK_SYSTEM_FROM_EMAIL` | Request a Quote emails | Postmark → server → API tokens / a verified sender |
| `ANDROID_SIGNING_CERT_SHA256` | Passkeys on Android (after #373) | §4 below |
| `ENFORCE_2FA` (optional) | Require two-step sign-in server-side | Leave unset until both apps' 2FA is tested |

## 4. Passkeys (Android)

1. Get the app signing key's SHA-256:
   - Play Store builds: Play Console → ToolBelt → Test and release → App integrity → App signing →
     "App signing key certificate" SHA-256.
   - EAS-signed APKs you sideload: `eas credentials -p android` → the keystore's SHA-256.
   Use both, comma-separated, if you test with both.
2. Set `ANDROID_SIGNING_CERT_SHA256` in Render (format `AA:BB:…`), redeploy.
3. Check: https://toolbelt-backend-dtvy.onrender.com/.well-known/assetlinks.json lists
   `tools.toolbelt.app` and your fingerprint(s). Then Security → Add passkey on a phone.

## 5. Google Places (vendor search)

1. Google Cloud console (project that owns the key) → enable **Places API (New)**.
2. Restrict the key by **API** (Places API (New) only). Don't restrict it to Android apps — the app calls
   Places over REST, which doesn't send Android app signatures.
3. Put it in `GOOGLE_PLACES_API_KEY` on Render. Check: Vending → Discover → Nearby Businesses returns
   results.

## 6. Stripe (payouts, card payments, Tap to Pay)

1. Stripe Dashboard → Connect → Settings: Express accounts enabled, your branding set.
2. Tap to Pay on Android: works on NFC phones running a supported Android version (Stripe's list), not
   rooted, with **a release/preview build** (Stripe refuses Tap to Pay in debuggable builds). The first
   time, the app creates a Terminal location from Settings → Business Address, so fill that in first.
3. Check: Settings → Payout Settings → Set Up Payouts completes and the screen shows "Approved"; a $1
   Card sale and a $1 Tap to Pay sale appear in Payments → Transactions and in Stripe.

## 7. Build the app

The app now uses native modules (Stripe, Tap to Pay, camera, contacts, calendar, photos, location,
passkeys), so **it no longer runs in Expo Go**. Use a development build:

1. `npm install`
2. `eas build --profile development --platform android` → install the APK on the phone.
3. `npx expo start --dev-client` and open the app on the phone.
4. For Tap to Pay and store testing: `eas build --profile preview --platform android` (installable APK,
   not debuggable) or `production` (Play bundle).

## 8. Test pass (on a phone)

- [ ] Sign up a new business → verification email arrives → sign in → home shows your business name.
- [ ] Staff: Staff → pick someone → Invite to App → copy password → sign out → Welcome → Staff member →
      sign in → forced new password → only the permitted screens show.
- [ ] Security → Set Up 2FA with Google Authenticator → backup codes shown → sign out → sign in asks for
      the code. Also test "Use a Backup Code".
- [ ] Security → Add passkey → sign out → Sign in with Passkey.
- [ ] Settings → Change Password.
- [ ] Payout Settings → Set Up Payouts → finish Stripe → returns to the app showing status.
- [ ] Payments → Card sale and Tap to Pay sale; appointment → Checkout.
- [ ] Online Booking → Create My Website → Copy link → open it in a browser → book a test slot → it shows
      in the calendar.
- [ ] Request a Quote sends (support inbox receives it).
- [ ] Accounting → Tax → AI Tax Analysis returns a report.
- [ ] Inventory → Scan a barcode; Clients → New → Import from Contacts; add a client photo.
- [ ] Import Data → Device Calendar imports events.
- [ ] Vending → Discover → Nearby Businesses.
- [ ] Settings → Appearance: try all looks; AI helper on home answers and its buttons open screens.

## 9. Decisions for Logan

- `src/lib/feature-flags.ts` still gates Payments, Accounting, Inventory, Vending and Marketing off for
  staff permissions (owners see everything on the home screen). Flip the flags when those modules ship.
- Messages settings: follow-ups and templates don't exist on iOS or the server either; the screen says so.
- Photos stay on the device (same as iOS).
- There's a stray file at the repo root whose name starts with `'+to+');` — looks like a pasted script;
  delete it if it isn't needed.
