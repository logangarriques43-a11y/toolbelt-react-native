/**
 * Tattoo API — settings, requests and portfolios (routes/tattooRoutes.js).
 * Contract: docs/tattoo-api.md in ToolBelt-final. Staff can read; only an owner
 * can write. Every route except /tattoo/settings is a 404 until the business
 * has turned tattoo intake on.
 */

import { api } from '@/lib/api-client';
import type {
  TattooIntake,
  TattooIntakeUpdate,
  TattooPortfolioItem,
  TattooPortfolioUpdate,
  TattooSettings,
  TattooSettingsUpdate,
  TattooSettingsUpdateResult,
} from '@/models/tattoo';

export async function getTattooSettings(): Promise<TattooSettings> {
  const d = await api.get<Partial<TattooSettings>>('/tattoo/settings');
  return {
    available: d.available === true,
    enabled: d.enabled === true,
    depositCents: d.depositCents ?? 0,
    consultationServiceId: d.consultationServiceId ?? null,
    styles: d.styles ?? [],
  };
}

export function updateTattooSettings(body: TattooSettingsUpdate): Promise<TattooSettingsUpdateResult> {
  return api.put<TattooSettingsUpdateResult>('/tattoo/settings', body);
}

export async function listTattooIntakes(): Promise<TattooIntake[]> {
  const res = await api.get<{ intakes?: TattooIntake[] }>('/tattoo/intakes');
  return res.intakes ?? [];
}

export function getTattooIntake(id: string): Promise<TattooIntake> {
  return api.get<TattooIntake>(`/tattoo/intakes/${encodeURIComponent(id)}`);
}

export function updateTattooIntake(id: string, body: TattooIntakeUpdate): Promise<TattooIntake> {
  return api.patch<TattooIntake>(`/tattoo/intakes/${encodeURIComponent(id)}`, body);
}

/** Omit `staffId` for the whole shop. */
export async function listTattooPortfolio(staffId?: string): Promise<TattooPortfolioItem[]> {
  const res = await api.get<{ items?: TattooPortfolioItem[] }>('/tattoo/portfolio', { staffId });
  return res.items ?? [];
}

export function addTattooPortfolioItem(body: {
  staffId: string;
  imageBase64: string;
  caption?: string;
}): Promise<TattooPortfolioItem> {
  return api.post<TattooPortfolioItem>('/tattoo/portfolio', body);
}

export function updateTattooPortfolioItem(id: string, body: TattooPortfolioUpdate): Promise<TattooPortfolioItem> {
  return api.patch<TattooPortfolioItem>(`/tattoo/portfolio/${encodeURIComponent(id)}`, body);
}

export function deleteTattooPortfolioItem(id: string): Promise<void> {
  return api.del(`/tattoo/portfolio/${encodeURIComponent(id)}`);
}
