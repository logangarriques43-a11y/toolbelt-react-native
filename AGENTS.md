# ToolBelt Android: rules for agents

**Stack:** Expo SDK 54, React Native 0.81, TypeScript (strict), expo-router, TanStack Query. Expo has changed a lot between versions, so read the docs for this exact version before writing Expo code: https://docs.expo.dev/versions/v54.0.0/.

**Needs a dev build.** The app uses `expo-dev-client`, Stripe Terminal and RevenueCat, so it does **not** run in Expo Go.

**Backend:** the ToolBelt backend on Render, shared with the iOS app. Every 2xx `/api` response is wrapped as `{status, data}`.

Why these rules exist: `docs/weed-audit-and-guardrails.md` in the ToolBelt-final repo.

## Before you write a workaround

Don't copy a block from another store or screen. Find or create the shared helper in `src/lib/`, and use it everywhere. Copy-pasted workarounds drift apart and turn into bugs.

`scripts/weed-ratchet.sh` fails CI when a known copy-paste pattern grows. If you remove copies, lower its baseline in the same PR. Never raise a baseline.

## Rules

- **Backend calls.** Make them only through `src/lib/api-client.ts`, which unwraps the envelope and attaches the Firebase token. No raw `fetch()` to our backend.
- **Backend URL and env.** Take the URL from `src/config/api.ts`: `API_BASE_URL` for API calls, `BACKEND_ORIGIN` for the public pages like `/terms`. Never hardcode `onrender.com`. Read `process.env` only in `src/config/` and `src/lib/firebase.ts`.
- **Errors.**
  - Never use `.catch(() => {})` or an empty `catch {}` on a server write or an auth/role check.
  - Show the failure to the user, and roll back optimistic changes.
  - Role checks fail closed: sign out or show an error. Never default to `'owner'`.
- **Per-account data.** Every new query key or AsyncStorage key must either include the uid or be listed in `src/lib/user-data-keys.ts`. The session clears the query cache and those keys on sign-out.
- **Optimistic lists.** Temp ids look like `optimistic-…`. Never send one to the server: wait for the create to finish (see `src/context/sales-store.tsx`).
- **Formatting helpers.** Phones: `src/lib/phone.ts`. Names: `src/lib/name.ts`. Colors: `withOpacity` in `src/lib/color.ts`. Don't define local copies.
- **UI tokens.** Colors come from `src/theme/tokens.ts` and `src/components/themed.tsx`. If a token is missing, add it there. Never assume white text on the accent color.
- **Icons.** Use only names present in `icon-map.ts`. An unmapped name renders blank in release builds.

## Checks

These must pass; CI runs both:
- `npx tsc --noEmit`
- `scripts/weed-ratchet.sh`
