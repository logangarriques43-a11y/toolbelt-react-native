/**
 * Booking Page API — the backend's online-booking website (bookingRoutes.js),
 * mirroring the Swift BookingPageManager.
 *
 * - GET  /booking-page        → the stored config (server defaults when none).
 * - POST /booking-page        → partial upsert: omitted keys keep their stored
 *   value. The full push also carries the published services, active staff
 *   and the device timezone (the authoritative business timezone for slot
 *   math). 409 when the slug belongs to another business — the server's
 *   message is user-ready, so callers surface ApiError.message as-is.
 * - POST /booking-page/logo   → base64 upload to Firebase Storage; returns the
 *   public URL, which the caller then pushes as `logoURL`. 413 over 5MB.
 *
 * Service/staff ids published here are backend ids (RN models use them
 * directly), so online bookings land in the same id space as AI-SMS and
 * manual appointments. Public URLs use the customer-facing api.toolbelt.tools host.
 */

import { api } from '@/lib/api-client';
import type { Service } from '@/models/service';
import type { StaffMember } from '@/models/staff';

export type BookingColorMode = 'single' | 'pair' | 'triple';
export type BookingFontFamily = 'modern' | 'classic' | 'friendly' | 'bold' | 'elegant';

export interface BookingPageConfig {
  slug: string;
  isEnabled: boolean;
  businessName: string;
  welcomeMessage: string;
  requireDeposit: boolean;
  depositPercent: number;
  /** Empty = every service available for online booking. */
  enabledServiceIds: string[];
  accentColorHex: string;
  secondaryColorHex: string | null;
  tertiaryColorHex: string | null;
  colorMode: BookingColorMode;
  logoURL: string | null;
  fontFamily: BookingFontFamily;
  maxAdvanceDays: number;
  minLeadTimeHours: number;
}

export const DEFAULT_BOOKING_CONFIG: BookingPageConfig = {
  slug: '',
  isEnabled: false,
  businessName: '',
  welcomeMessage: 'Book your appointment online!',
  requireDeposit: false,
  depositPercent: 50,
  enabledServiceIds: [],
  accentColorHex: '#6366F1',
  secondaryColorHex: null,
  tertiaryColorHex: null,
  colorMode: 'single',
  logoURL: null,
  fontFamily: 'modern',
  maxAdvanceDays: 30,
  minLeadTimeHours: 2,
};

interface BookingServiceDTO {
  id: string;
  name: string;
  duration: number;
  price: number;
  priceType: 'fixed' | 'variable';
  minPrice?: number;
  maxPrice?: number;
  colorHex: string;
  noDoubleBooking?: boolean;
  availableForOnlineBooking?: boolean;
}

interface BookingStaffDTO {
  id: string;
  name: string;
  role: string;
  assignedServiceIds: string[];
}

export interface BookingPagePush extends Partial<BookingPageConfig> {
  services?: BookingServiceDTO[];
  staffMembers?: BookingStaffDTO[];
  timezone?: string;
}

const FONTS: BookingFontFamily[] = ['modern', 'classic', 'friendly', 'bold', 'elegant'];
const MODES: BookingColorMode[] = ['single', 'pair', 'triple'];

/** Normalise the server payload onto the full config (older servers omit fields). */
function fromDTO(d: Partial<BookingPageConfig> | null | undefined): BookingPageConfig {
  const c = { ...DEFAULT_BOOKING_CONFIG, ...(d ?? {}) };
  return {
    ...c,
    slug: c.slug ?? '',
    businessName: c.businessName ?? '',
    welcomeMessage: c.welcomeMessage ?? DEFAULT_BOOKING_CONFIG.welcomeMessage,
    enabledServiceIds: Array.isArray(c.enabledServiceIds) ? c.enabledServiceIds : [],
    secondaryColorHex: c.secondaryColorHex ?? null,
    tertiaryColorHex: c.tertiaryColorHex ?? null,
    colorMode: MODES.includes(c.colorMode) ? c.colorMode : 'single',
    fontFamily: FONTS.includes(c.fontFamily) ? c.fontFamily : 'modern',
    logoURL: c.logoURL ?? null,
  };
}

export async function getBookingPage(): Promise<BookingPageConfig> {
  return fromDTO(await api.get<Partial<BookingPageConfig>>('/booking-page'));
}

export async function pushBookingPage(body: BookingPagePush): Promise<BookingPageConfig> {
  return fromDTO(await api.post<Partial<BookingPageConfig>>('/booking-page', body));
}

export async function uploadBookingLogo(imageBase64: string, contentType: string): Promise<string> {
  const res = await api.post<{ logoURL: string; storagePath: string }>('/booking-page/logo', {
    imageBase64,
    contentType,
  });
  return res.logoURL;
}

/** The services the public page should list: online-bookable, then the owner's pick (if any). */
export function bookableServices(services: Service[], enabledServiceIds: string[]): Service[] {
  const online = services.filter((s) => s.availableForOnlineBooking);
  if (enabledServiceIds.length === 0) return online;
  return online.filter((s) => enabledServiceIds.includes(s.id));
}

export function toServiceDTO(s: Service): BookingServiceDTO {
  return {
    id: s.id,
    name: s.name,
    duration: s.duration,
    price: s.price,
    priceType: s.priceType === 'Variable' ? 'variable' : 'fixed',
    minPrice: s.minPrice,
    maxPrice: s.maxPrice,
    colorHex: s.colorHex,
    noDoubleBooking: s.noDoubleBooking,
    availableForOnlineBooking: s.availableForOnlineBooking,
  };
}

export function toStaffDTOs(staff: StaffMember[]): BookingStaffDTO[] {
  return staff
    .filter((m) => m.isActive)
    .map((m) => ({ id: m.id, name: m.name, role: m.role, assignedServiceIds: m.assignedServiceIds }));
}

/** The device's IANA zone (falls back to the backend's own default when unavailable). */
export function deviceTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Public host for the booking + consent pages — the customer-facing domain
 * (fronts the same backend as API_BASE_URL; links clients see must use it).
 */
export const PUBLIC_HOST = 'https://api.toolbelt.tools';

export const bookingURL = (slug: string) => (slug ? `${PUBLIC_HOST}/book/${slug}` : '');
export const consentURL = (slug: string) => (slug ? `${PUBLIC_HOST}/consent/${slug}` : '');

/** iOS slug rule: lowercase, spaces → dashes, keep [a-z0-9-]. */
export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Stripe Connect payout approval (deposits need a connected, approved account). */
export async function payoutsApproved(): Promise<boolean> {
  const s = await api.get<{
    hasAccount: boolean;
    accountStatus?: string;
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  }>('/stripe/connect/account-status');
  if (!s?.hasAccount) return false;
  return s.accountStatus === 'approved' || (!!s.chargesEnabled && !!s.payoutsEnabled);
}
