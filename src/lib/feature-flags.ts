/**
 * Ship gates — port of Swift `FeatureFlags` (PermissionsManager.swift).
 *
 * Modules not ready for v1.0 are hidden everywhere by flipping a flag here
 * rather than deleting code, so they can be turned on per build as each is
 * tested. The RN app already stubs most gated modules; these flags drive the
 * few entry points that show/hide outright (e.g. the hamburger "Waitlist" item).
 */
export const FeatureFlags = {
  payments: false, // Payments dashboard + in-person Checkout (card reader)
  accounting: false, // Financial Reports + Tax & Expenses
  inventory: false,
  vending: false,
  marketing: false,
  importData: true, // imports Clients/Services/Appointments (all shipped)
  waitlist: false, // hidden for v1.0 — not needed yet
} as const;
