/**
 * Account API — account-level actions for the signed-in user.
 *
 * deleteAccount() hits the backend purge route that permanently removes the
 * business and all associated data, then the caller signs out:
 *   DELETE /api/v1/account
 * (api-client prepends the /api/v1 base and attaches the Firebase token).
 *
 * Business name: there is no /me or /business endpoint. The server keeps two
 * copies of the name — the booking-page config (read here as the fallback when
 * nothing is cached on the device) and the SMS sender name, which
 * `updateBusinessName` writes (PATCH /phone-numbers/business-name).
 */

import { api } from '@/lib/api-client';

export async function deleteAccount(): Promise<void> {
  await api.del('/account');
}

/** The business name saved on the booking-page config, or '' when unset. */
export async function fetchBookingBusinessName(): Promise<string> {
  const page = await api.get<{ businessName?: string | null } | null>('/booking-page');
  return (page?.businessName ?? '').trim();
}

/** Save the business name server-side (400 when empty). */
export async function updateBusinessName(businessName: string): Promise<void> {
  await api.patch('/phone-numbers/business-name', { businessName });
}
