/**
 * Account API — account-level actions for the signed-in user.
 *
 * deleteAccount() hits the backend purge route that permanently removes the
 * business and all associated data, then the caller signs out. The endpoint is
 * built by the backend team; this calls:
 *   DELETE /api/v1/account
 * (api-client prepends the /api/v1 base and attaches the Firebase token).
 */

import { api } from '@/lib/api-client';

export async function deleteAccount(): Promise<void> {
  await api.del('/account');
}
