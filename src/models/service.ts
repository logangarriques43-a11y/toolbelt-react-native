/**
 * Service model — port of Service.swift (+ PriceType.swift).
 * SwiftData/backend-sync fields (serverId, lastModifiedAt) are omitted until the
 * sync layer lands; colors are stored as hex strings as in the Swift `colorHex`.
 */

import { iOSColors } from '@/theme/tokens';

export type PriceType = 'Fixed' | 'Variable';

export interface Service {
  id: string;
  name: string;
  colorHex: string;
  price: number;
  minPrice?: number;
  maxPrice?: number;
  /** Minutes. */
  duration: number;
  priceType: PriceType;
  processingTime: number;
  blockTime: number;
  noDoubleBooking: boolean;
  availableForOnlineBooking: boolean;
}

export const DEFAULT_SERVICE_COLOR = iOSColors.purple;

/** duration + processingTime + blockTime. */
export function totalTime(s: Service): number {
  return s.duration + s.processingTime + s.blockTime;
}

function formatCurrency(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
}

/** Mirrors `Service.priceDisplay` — the value shown after a leading "$". */
export function priceDisplay(s: Service): string {
  if (s.priceType === 'Variable' && s.minPrice != null && s.maxPrice != null) {
    return `${formatCurrency(s.minPrice)} - $${formatCurrency(s.maxPrice)}`;
  }
  return formatCurrency(s.price);
}
