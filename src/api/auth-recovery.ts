/**
 * Account-recovery API — 2FA backup codes (accountRecoveryRoutes.js).
 *
 * - store: POST /auth/recovery/store-backup-code {codes} replaces the whole set
 *   (max 10, each 8+ chars). Codes are hashed server-side and only ever shown
 *   on the device at the moment they're generated.
 * - status: GET /auth/recovery/backup-code-status → {hasCodes, remaining, total}.
 * - redeem: POST /auth/recovery/backup-code {email, code} (public) → a Firebase
 *   custom token. Redeeming also clears the enrolled second factor and asks the
 *   user to set a new password (`mustResetPassword`).
 * - markTwoFactorSetupComplete: the onboarding flag iOS writes after setup.
 */

import { ApiError, api } from '@/lib/api-client';

export interface BackupCodeStatus {
  hasCodes: boolean;
  remaining: number;
  total: number;
}

export interface BackupCodeRedemption {
  customToken: string;
  mustResetPassword: boolean;
  remainingCodes?: number;
  twoFactorCleared?: boolean;
}

/** How many codes a fresh set contains (the server's maximum). */
export const BACKUP_CODE_COUNT = 10;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** One code: five dash-separated groups of five lowercase letters. */
export function generateBackupCode(): string {
  const cryptoObj = (globalThis as { crypto?: { getRandomValues?: (a: Uint32Array) => Uint32Array } }).crypto;
  const values = new Uint32Array(25);
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(values);
  else for (let i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 0xffffffff);
  const groups: string[] = [];
  for (let g = 0; g < 5; g++) {
    let group = '';
    for (let i = 0; i < 5; i++) group += LETTERS[values[g * 5 + i] % LETTERS.length];
    groups.push(group);
  }
  return groups.join('-');
}

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, generateBackupCode);
}

export async function storeBackupCodes(codes: string[]): Promise<{ stored: boolean; count: number }> {
  return api.post('/auth/recovery/store-backup-code', { codes });
}

export async function fetchBackupCodeStatus(): Promise<BackupCodeStatus> {
  return api.get<BackupCodeStatus>('/auth/recovery/backup-code-status');
}

export async function redeemBackupCode(email: string, code: string): Promise<BackupCodeRedemption> {
  try {
    return await api.post<BackupCodeRedemption>('/auth/recovery/backup-code', {
      email: email.trim().toLowerCase(),
      code: code.trim().toLowerCase(),
    });
  } catch (e) {
    // The client maps every 401 to "please sign in again"; this public route's
    // 401 means "email and code don't match", so surface the server's wording.
    if (e instanceof ApiError && e.status === 401) {
      const serverMessage = (e.body as { error?: string } | null)?.error;
      throw new ApiError(401, serverMessage || 'That email and backup code don’t match.', e.code, e.body);
    }
    throw e;
  }
}

/** Record that two-step sign-in was set up (merged into the onboarding blob). */
export async function markTwoFactorSetupComplete(): Promise<void> {
  await api.post('/onboarding/save', { twoFactorSetupComplete: true });
}
