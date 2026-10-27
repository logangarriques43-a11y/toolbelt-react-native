/**
 * Google Places (New) — nearby supplier search for Vendor Discovery.
 *
 * The backend only hands out the key (GET /config/places-key → {apiKey}, ""
 * when Places is disabled); the app then calls Google's Text Search directly,
 * biased to a circle around the device's location. Field mask and body follow
 * gap-contracts §8 (same request iOS makes).
 */

import { api } from '@/lib/api-client';

export const MILES_TO_METERS = 1609.344;
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.types',
  'places.location',
  'places.businessStatus',
].join(',');

export interface Place {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  ratingCount?: number;
  types: string[];
  latitude?: number;
  longitude?: number;
  businessStatus?: string;
}

interface PlaceDTO {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  location?: { latitude?: number; longitude?: number };
  businessStatus?: string;
}

/** The Places API key from the backend; "" means the feature is turned off. */
export async function getPlacesKey(): Promise<string> {
  const res = await api.get<{ apiKey?: string }>('/config/places-key');
  return (res?.apiKey ?? '').trim();
}

/** Text Search around a point. `radiusMeters` is clamped to Google's 50 km max. */
export async function searchPlaces({
  apiKey,
  query,
  latitude,
  longitude,
  radiusMeters,
}: {
  apiKey: string;
  query: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}): Promise<Place[]> {
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: { circle: { center: { latitude, longitude }, radius: Math.min(radiusMeters, 50_000) } },
      maxResultCount: 20,
    }),
  });
  const json = (await res.json().catch(() => null)) as { places?: PlaceDTO[]; error?: { message?: string } } | null;
  if (!res.ok) throw new Error(json?.error?.message || `Google Places request failed (${res.status}).`);
  return (json?.places ?? []).map((p) => ({
    id: p.id,
    name: p.displayName?.text ?? 'Unnamed business',
    address: p.formattedAddress,
    phone: p.internationalPhoneNumber,
    website: p.websiteUri,
    rating: p.rating,
    ratingCount: p.userRatingCount,
    types: p.types ?? [],
    latitude: p.location?.latitude,
    longitude: p.location?.longitude,
    businessStatus: p.businessStatus,
  }));
}
