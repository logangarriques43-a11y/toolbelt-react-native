/**
 * Session context — the RN counterpart to `Router`'s auth/onboarding state
 * (Router.swift + the gating logic in ContentView.rootView).
 *
 * SwiftUI's `Router` held both navigation path AND auth state. In expo-router
 * navigation is handled by the file-based router, so this context owns only the
 * auth/onboarding *state* that decides which route group is active. Navigation
 * itself uses `router` from `expo-router`.
 *
 * Scope: business-owner-only for now (the client branch of rootView is out of
 * scope). Native onboarding (2FA, Stripe payout) is stubbed — the completion
 * methods here flip the same flags the native flow eventually will.
 *
 * Persistence is deferred (SwiftUI restored via Firebase + UserDefaults); state
 * is in-memory until an auth backend + secure storage land in a later phase.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Account {
  name: string;
  email?: string;
  businessName?: string;
  phoneNumber?: string;
  isBusinessOwner: boolean;
}

/** Which top-level route group should be active — mirrors rootView's branches. */
export type Gate = 'auth' | 'onboarding' | 'app';

interface SessionState {
  account: Account | null;
  twoFactorSetupComplete: boolean;
  twoFactorVerified: boolean;
  payoutComplete: boolean;
  payoutSkipped: boolean;
}

export interface Session extends SessionState {
  gate: Gate;
  signIn: (account: Account) => void;
  signOut: () => void;
  /** Merge updates into the signed-in account (Edit Profile / Business Info). */
  updateAccount: (updates: Partial<Account>) => void;
  /** Stub seam for the (deferred) native 2FA setup flow. */
  completeTwoFactorSetup: () => void;
  verifyTwoFactor: () => void;
  /** Stub seams for the (deferred) Stripe Connect payout flow. */
  completePayout: () => void;
  skipPayout: () => void;
}

const INITIAL: SessionState = {
  account: null,
  twoFactorSetupComplete: false,
  twoFactorVerified: false,
  payoutComplete: false,
  payoutSkipped: false,
};

const SessionContext = createContext<Session | null>(null);

/** Resolves the active gate from session state — see ContentView.rootView. */
function resolveGate(s: SessionState): Gate {
  if (!s.account) return 'auth';
  // Business-owner branch only.
  const onboarded =
    s.twoFactorSetupComplete &&
    s.twoFactorVerified &&
    (s.payoutComplete || s.payoutSkipped);
  return onboarded ? 'app' : 'onboarding';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL);

  const value = useMemo<Session>(
    () => ({
      ...state,
      gate: resolveGate(state),
      signIn: (account) =>
        // login() resets twoFactorVerified to false (Router.login).
        setState({ ...INITIAL, account }),
      signOut: () => setState(INITIAL),
      updateAccount: (updates) =>
        setState((s) => (s.account ? { ...s, account: { ...s.account, ...updates } } : s)),
      completeTwoFactorSetup: () =>
        setState((s) => ({ ...s, twoFactorSetupComplete: true })),
      verifyTwoFactor: () => setState((s) => ({ ...s, twoFactorVerified: true })),
      completePayout: () => setState((s) => ({ ...s, payoutComplete: true })),
      skipPayout: () => setState((s) => ({ ...s, payoutSkipped: true })),
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return session;
}
