/**
 * App settings blob — `appSettings` inside the per-user onboarding document,
 * read with `GET /onboarding/load` and written with `POST /onboarding/save`
 * (Firestore merge, so keys we don't send — iOS-only ones like invoice terms —
 * are kept). Same blob as Swift BusinessSettingsSync; the server reads
 * `reminderTimingHours` for appointments it creates (online booking, AI texting).
 */

import { api } from '@/lib/api-client';

/** The subset of AppSettingsBlob the RN Settings screens edit. */
export interface AppSettingsBlob {
  addressStreet?: string;
  addressApt?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  reminderTimingHours?: number;
  notifEmail?: boolean;
  notifSms?: boolean;
  aiAutoReply?: boolean;
}

export async function loadAppSettings(): Promise<AppSettingsBlob | null> {
  const res = await api.get<{ data?: { appSettings?: AppSettingsBlob } | null }>('/onboarding/load');
  return res?.data?.appSettings ?? null;
}

export async function saveAppSettings(appSettings: AppSettingsBlob): Promise<void> {
  await api.post('/onboarding/save', { appSettings });
}
