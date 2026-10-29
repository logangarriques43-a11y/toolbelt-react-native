/**
 * Session context — the RN counterpart to `Router`'s auth state plus the iOS
 * owner/staff session managers (AuthManager + StaffSessionManager).
 *
 * Firebase is the source of truth for *who* is signed in; this context decides
 * *what kind* of session that is and which route group is active:
 *
 * - Role: the ID token's `role` claim (`'staff'` for staff logins created by the
 *   owner's Invite to App; anything else is an owner). The role is cached per uid
 *   so an offline cold start with an expired token still lands in the right mode.
 * - Staff: GET /staff/me supplies the staff record (name, permission map,
 *   mustChangePassword). It is cached per uid in AsyncStorage so permissions
 *   survive an offline cold start; a 404 on cold start means access was revoked
 *   (empty map). Interactive staff sign-in is stricter: any failure signs the
 *   user back out with a plain message, as on iOS.
 * - Owner: name = Firebase displayName (or email prefix). The business name has
 *   no server "profile" — it is kept on the device per uid, backfilled from the
 *   booking-page config, and pushed to the server's SMS sender name on change.
 *
 * Sign-in flows that need to validate before the app opens (staff sign-in, MFA,
 * registration, custom tokens) run through `runInteractive`, which tells the
 * auth listener to stand aside while the flow hydrates the session itself.
 *
 * Gates: `auth` (signed out) → `onboarding` (a password must be set first: staff
 * temporary password, or an owner who recovered with a backup code) → `app`.
 * Staff skip every owner gate (2FA / payout prompts are owner-only).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  signInWithCustomToken as firebaseSignInWithCustomToken,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  TotpMultiFactorGenerator,
  updatePassword,
  updateProfile,
  type MultiFactorResolver,
  type User,
} from 'firebase/auth';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { fetchBookingBusinessName, updateBusinessName } from '@/api/account';
import { fetchStaffMe, markStaffPasswordChanged } from '@/api/staff';
import { ApiError } from '@/lib/api-client';
import { auth } from '@/lib/firebase';
import { USER_DATA_KEYS } from '@/lib/user-data-keys';
import type { StaffMember } from '@/models/staff';

export interface Account {
  name: string;
  email?: string;
  businessName?: string;
  phoneNumber?: string;
  isBusinessOwner: boolean;
}

export type SessionRole = 'owner' | 'staff';

/** Which top-level route group should be active — mirrors rootView's branches. */
export type Gate = 'auth' | 'onboarding' | 'app';

/** A sign-in failure whose message is safe to show as-is. */
export class SignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignInError';
  }
}

interface SessionState {
  account: Account | null;
  uid: string | null;
  role: SessionRole | null;
  /** The signed-in staff member's own record (staff sessions only). */
  staff: StaffMember | null;
  /** Owner recovered with a backup code and must choose a new password. */
  mustResetPassword: boolean;
  twoFactorSetupComplete: boolean;
  twoFactorVerified: boolean;
  payoutComplete: boolean;
  payoutSkipped: boolean;
}

export interface RegisterInput {
  name: string;
  businessName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface Session extends SessionState {
  gate: Gate;
  /** True until Firebase's first auth-state callback resolves (avoids a
   *  login-screen flash before a persisted session is restored). */
  initializing: boolean;
  /** Owner (or any) email sign-in. Throws the Firebase error unchanged when a
   *  second factor is needed (`auth/multi-factor-auth-required`). */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Staff sign-in: validates the staff record before opening the app. */
  signInStaff: (email: string, password: string) => Promise<void>;
  /** Finish an MFA sign-in with a 6-digit authenticator code. */
  resolveTwoFactor: (resolver: MultiFactorResolver, code: string) => Promise<void>;
  /** Exchange a server-minted custom token (passkey / backup code). */
  signInWithToken: (token: string, opts?: { mustResetPassword?: boolean }) => Promise<void>;
  /** Create the owner account (Firebase user, display name, verification email). */
  register: (input: RegisterInput) => Promise<void>;
  /** Set a new password for the forced-change screen; `currentPassword`
   *  re-authenticates first when Firebase asks for a recent sign-in. */
  setNewPassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  /** Re-fetch the staff record (permissions) — no-op for owners. */
  refreshStaff: () => Promise<void>;
  signOut: () => void;
  /** Merge updates into the signed-in account (Edit Profile / Business Info),
   *  saving locally and pushing what the server keeps (best-effort). */
  updateAccount: (updates: Partial<Account>) => Promise<void>;
  completeTwoFactorSetup: () => void;
  verifyTwoFactor: () => void;
  completePayout: () => void;
  skipPayout: () => void;
}

const INITIAL: SessionState = {
  account: null,
  uid: null,
  role: null,
  staff: null,
  mustResetPassword: false,
  twoFactorSetupComplete: false,
  twoFactorVerified: false,
  payoutComplete: false,
  payoutSkipped: false,
};

/** Owner launch gates stay open in the RN app (the 2FA / payout prompts live in
 *  Security and Payouts rather than blocking launch). */
const OPEN_GATES = {
  twoFactorSetupComplete: true,
  twoFactorVerified: true,
  payoutComplete: false,
  payoutSkipped: true,
};

const SessionContext = createContext<Session | null>(null);

// --- Device storage (per uid) ----------------------------------------------

interface LocalProfile {
  businessName?: string;
  phoneNumber?: string;
  email?: string;
}

const profileKey = (uid: string) => `session.profile.${uid}`;
const roleKey = (uid: string) => `session.role.${uid}`;
const staffKey = (uid: string) => `session.staff.${uid}`;
const resetKey = (uid: string) => `session.mustResetPassword.${uid}`;

async function readJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Device storage is a cache — never fail a flow over it.
  }
}

async function mergeProfile(uid: string, updates: LocalProfile): Promise<void> {
  const current = (await readJSON<LocalProfile>(profileKey(uid))) ?? {};
  await writeJSON(profileKey(uid), { ...current, ...updates });
}

// --- Hydration ---------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiError(0, 'Request timed out', 'network')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

async function detectRole(user: User): Promise<SessionRole> {
  try {
    const result = await user.getIdTokenResult();
    const role: SessionRole = result.claims.role === 'staff' ? 'staff' : 'owner';
    AsyncStorage.setItem(roleKey(user.uid), role).catch(() => {});
    return role;
  } catch {
    // Offline with an expired token — fall back to the last known role. With
    // none cached there's nothing safe to assume: never default to owner.
    const cached = await cachedRole(user.uid);
    if (cached) return cached;
    throw new SignInError("Couldn't reach ToolBelt to check your account. Check your connection and try again.");
  }
}

async function cachedRole(uid: string): Promise<SessionRole | null> {
  const cached = await AsyncStorage.getItem(roleKey(uid)).catch(() => null);
  return cached === 'staff' || cached === 'owner' ? cached : null;
}

function staffErrorMessage(e: unknown): string {
  if (e instanceof SignInError) return e.message;
  if (e instanceof ApiError) {
    if (e.status === 404) {
      return "This account isn't set up as a staff login. Ask the business owner to invite you.";
    }
    if (e.status === 401) {
      return "This staff login isn't linked to a business yet. Ask the business owner to send your invite again.";
    }
    if (e.status === 0) return "Couldn't reach ToolBelt. Check your connection and try again.";
    return e.message;
  }
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

async function loadStaff(user: User, interactive: boolean): Promise<StaffMember | null> {
  try {
    const me = await withTimeout(fetchStaffMe(), interactive ? 20_000 : 8_000);
    if (interactive && (!me.businessOwnerUid || !me.loginEmail)) {
      throw new SignInError(
        "This staff login's setup is incomplete. Ask the business owner to invite you again from Staff → Invite to App.",
      );
    }
    await writeJSON(staffKey(user.uid), me);
    return me;
  } catch (e) {
    if (interactive) throw new SignInError(staffErrorMessage(e));
    const cached = await readJSON<StaffMember>(staffKey(user.uid));
    // 404 on cold start = the owner revoked access: keep the session, deny all.
    if (e instanceof ApiError && e.status === 404) return cached ? { ...cached, permissions: {} } : null;
    return cached;
  }
}

async function hydrate(user: User, interactive: boolean, expect?: SessionRole): Promise<SessionState> {
  const role = await detectRole(user);
  if (expect === 'staff' && role !== 'staff') {
    throw new SignInError('This is a business owner account. Go back and use Sign in instead.');
  }
  const profile = (await readJSON<LocalProfile>(profileKey(user.uid))) ?? {};
  const mustResetPassword = (await AsyncStorage.getItem(resetKey(user.uid)).catch(() => null)) === '1';
  const fallbackName =
    user.displayName || (user.email ? user.email.split('@')[0] : role === 'staff' ? 'Staff member' : 'Business Owner');

  if (role === 'staff') {
    const staff = await loadStaff(user, interactive);
    return {
      ...INITIAL,
      ...OPEN_GATES,
      uid: user.uid,
      role,
      staff,
      account: {
        name: staff?.name || fallbackName,
        email: user.email ?? staff?.loginEmail,
        businessName: profile.businessName,
        phoneNumber: staff?.phoneNumber || undefined,
        isBusinessOwner: false,
      },
    };
  }

  return {
    ...INITIAL,
    ...OPEN_GATES,
    uid: user.uid,
    role,
    mustResetPassword,
    account: {
      name: fallbackName,
      email: profile.email || user.email || undefined,
      businessName: profile.businessName,
      phoneNumber: profile.phoneNumber,
      isBusinessOwner: true,
    },
  };
}

/** Which gate the session opens — see ContentView.rootView. */
function resolveGate(s: SessionState): Gate {
  if (!s.account) return 'auth';
  if (s.mustResetPassword) return 'onboarding';
  if (s.role === 'staff' && s.staff?.mustChangePassword) return 'onboarding';
  return 'app';
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(INITIAL);
  const [initializing, setInitializing] = useState(true);
  const stateRef = useRef(state);
  stateRef.current = state;
  /** >0 while an interactive flow owns hydration (the listener stands aside). */
  const pending = useRef(0);

  /** Fill in the business name from the booking page when the device has none. */
  const backfillBusinessName = useCallback(async (s: SessionState) => {
    if (!s.uid || s.account?.businessName) return;
    try {
      const name = await fetchBookingBusinessName();
      if (!name) return;
      await mergeProfile(s.uid, { businessName: name });
      setState((cur) =>
        cur.uid === s.uid && cur.account && !cur.account.businessName
          ? { ...cur, account: { ...cur.account, businessName: name } }
          : cur,
      );
    } catch {
      // Best-effort: no booking page yet, offline, or 2FA-gated.
    }
  }, []);

  const apply = useCallback(
    (next: SessionState) => {
      setState(next);
      void backfillBusinessName(next);
    },
    [backfillBusinessName],
  );

  // Wipe one account's cached data when that account leaves, so the next
  // person on this phone never sees it (query cache + USER_DATA_KEYS).
  const queryClient = useQueryClient();
  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid ?? null;
      if (lastUid.current && lastUid.current !== uid) {
        queryClient.clear();
        void AsyncStorage.multiRemove(Object.values(USER_DATA_KEYS)).catch(() => {});
      }
      lastUid.current = uid;

      if (!user) {
        setState(INITIAL);
        setInitializing(false);
        return;
      }
      if (pending.current > 0 || stateRef.current.uid === user.uid) {
        setInitializing(false);
        return;
      }
      hydrate(user, false)
        .then((next) => {
          if (auth.currentUser?.uid === user.uid) apply(next);
        })
        .catch(async () => {
          // Hydration is defensive; if it still fails, reopen as a plain owner
          // only when this device has seen this user as an owner before.
          // Otherwise sign out: a failed check must never grant the owner role.
          const role = await cachedRole(user.uid);
          if (auth.currentUser?.uid !== user.uid) return;
          if (role === 'owner') {
            apply({
              ...INITIAL,
              ...OPEN_GATES,
              uid: user.uid,
              role: 'owner',
              account: { name: user.displayName || user.email || 'Business Owner', email: user.email ?? undefined, isBusinessOwner: true },
            });
          } else {
            await firebaseSignOut(auth).catch(() => {});
          }
        })
        .finally(() => setInitializing(false));
    });
    return unsub;
  }, [apply, queryClient]);

  /**
   * Run a sign-in flow that hydrates the session itself. A SignInError signs
   * the half-open Firebase session back out; other errors (e.g. the MFA
   * challenge) are rethrown untouched for the screen to handle.
   */
  const runInteractive = useCallback(
    async (signIn: () => Promise<User>, opts: { expect?: SessionRole; extra?: Partial<SessionState> } = {}) => {
      pending.current += 1;
      try {
        const user = await signIn();
        const next = await hydrate(user, true, opts.expect);
        apply({ ...next, ...opts.extra });
      } catch (e) {
        if (e instanceof SignInError && auth.currentUser) {
          await firebaseSignOut(auth).catch(() => {});
        }
        throw e;
      } finally {
        pending.current -= 1;
      }
    },
    [apply],
  );

  const value = useMemo<Session>(
    () => ({
      ...state,
      initializing,
      gate: resolveGate(state),

      signInWithEmail: (email, password) =>
        runInteractive(async () => (await signInWithEmailAndPassword(auth, email.trim(), password)).user),

      signInStaff: (email, password) =>
        runInteractive(
          async () => (await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)).user,
          { expect: 'staff' },
        ),

      resolveTwoFactor: (resolver, code) =>
        runInteractive(async () => {
          const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
          if (!hint) {
            throw new SignInError(
              "Your account uses text-message codes for two-step sign-in, which this app can't receive yet. Use a backup code instead.",
            );
          }
          const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code.trim());
          return (await resolver.resolveSignIn(assertion)).user;
        }),

      signInWithToken: async (token, opts) => {
        await runInteractive(
          async () => {
            const user = (await firebaseSignInWithCustomToken(auth, token)).user;
            if (opts?.mustResetPassword) await AsyncStorage.setItem(resetKey(user.uid), '1').catch(() => {});
            return user;
          },
          { extra: opts?.mustResetPassword ? { mustResetPassword: true } : undefined },
        );
      },

      register: async ({ name, businessName, email, password, phoneNumber }) => {
        await runInteractive(async () => {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: name.trim() }).catch(() => {});
          await sendEmailVerification(cred.user).catch(() => {});
          await mergeProfile(cred.user.uid, {
            businessName: businessName.trim(),
            phoneNumber: phoneNumber?.trim() || undefined,
          });
          return cred.user;
        });
        // The server's copy of the name (SMS sender) — best-effort.
        updateBusinessName(businessName.trim()).catch(() => {});
      },

      setNewPassword: async (newPassword, currentPassword) => {
        const user = auth.currentUser;
        if (!user) throw new SignInError('You are signed out. Please sign in again.');
        if (currentPassword && user.email) {
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
        }
        await updatePassword(user, newPassword);
        await AsyncStorage.removeItem(resetKey(user.uid)).catch(() => {});

        const cur = stateRef.current;
        if (cur.role === 'staff') {
          // Non-blocking on iOS: the password is already changed in Firebase.
          await markStaffPasswordChanged().catch(() => {});
          let staff: StaffMember | null = cur.staff
            ? { ...cur.staff, mustChangePassword: false, hasSignedIn: true }
            : null;
          try {
            staff = await fetchStaffMe();
            staff = { ...staff, mustChangePassword: false };
            await writeJSON(staffKey(user.uid), staff);
          } catch {
            // Keep the locally-updated record; the next launch re-fetches.
          }
          setState((s) => ({ ...s, staff, mustResetPassword: false }));
        } else {
          setState((s) => ({ ...s, mustResetPassword: false }));
        }
      },

      refreshStaff: async () => {
        const user = auth.currentUser;
        if (!user || stateRef.current.role !== 'staff') return;
        const staff = await loadStaff(user, false);
        setState((s) => (s.uid === user.uid ? { ...s, staff } : s));
      },

      signOut: () => {
        void firebaseSignOut(auth); // onAuthStateChanged then resets state
      },

      updateAccount: async (updates) => {
        const cur = stateRef.current;
        if (!cur.account || !cur.uid) return;
        const prev = cur.account;
        setState((s) => (s.account ? { ...s, account: { ...s.account, ...updates } } : s));

        const local: LocalProfile = {};
        if ('businessName' in updates) local.businessName = updates.businessName;
        if ('phoneNumber' in updates) local.phoneNumber = updates.phoneNumber;
        if ('email' in updates) local.email = updates.email;
        await mergeProfile(cur.uid, local);

        const user = auth.currentUser;
        if (cur.role === 'owner' && user && updates.name && updates.name !== prev.name) {
          updateProfile(user, { displayName: updates.name }).catch(() => {});
        }
        const nextName = updates.businessName?.trim();
        if (cur.role === 'owner' && nextName && nextName !== prev.businessName) {
          updateBusinessName(nextName).catch(() => {});
        }
      },

      completeTwoFactorSetup: () => setState((s) => ({ ...s, twoFactorSetupComplete: true })),
      verifyTwoFactor: () => setState((s) => ({ ...s, twoFactorVerified: true })),
      completePayout: () => setState((s) => ({ ...s, payoutComplete: true })),
      skipPayout: () => setState((s) => ({ ...s, payoutSkipped: true })),
    }),
    [state, initializing, runInteractive],
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
