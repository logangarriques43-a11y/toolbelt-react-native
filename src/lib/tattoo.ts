/**
 * Pure tattoo helpers: money parsing, labels and the "[Photo]" rule. No React
 * Native imports here, so these stay plain logic.
 */

import type {
  TattooDepositStatus,
  TattooIntake,
  TattooIntakeStatus,
  TattooReviewReason,
  TattooStyle,
} from '@/models/tattoo';

/** Stripe's USD minimum, and the backend's default ceiling for one charge. */
export const MIN_DEPOSIT_CENTS = 50;
export const MAX_DEPOSIT_CENTS = 1_000_000;

/** The API's limit on a portfolio image. */
export const MAX_PORTFOLIO_IMAGE_BYTES = 3_932_160;

/** Signed links last 15 minutes, so an open screen renews them before that. */
export const SIGNED_URL_REFRESH_MS = 10 * 60 * 1000;

/** Declining a booked request would leave its appointment behind. */
export function canDecline(intake: TattooIntake): boolean {
  return intake.status !== 'declined' && intake.status !== 'booked' && !intake.appointmentId;
}

/** Declining doesn't lift a review, so a declined client can still be cleared. */
export function canMarkReviewed(intake: TattooIntake): boolean {
  return intake.status === 'needs_review' || (intake.status === 'declined' && !!intake.reviewReason);
}

export function declineWarning(intake: TattooIntake): string {
  const base = 'The client is not told. You can still text them from the conversation.';
  return intake.reviewReason ? `${base} They stay blocked from booking until you mark them reviewed.` : base;
}

/** The body the backend stores for a message that is only a photo. */
export const PHOTO_ONLY_BODY = '[Photo]';

export type DollarsResult = { ok: true; cents: number } | { ok: false; error: string };

const PLAIN_DOLLARS = /^(\d+)?(?:\.(\d{0,2}))?$/;
const GROUPED_DOLLARS = /^(\d{1,3}(?:,\d{3})+)(?:\.(\d{0,2}))?$/;

/**
 * A typed deposit, in dollars, to integer cents. Blank is 0 (no deposit).
 * Works on the digits rather than floats, so 19.99 is exactly 1999. A comma
 * only counts as a thousands separator: "12,50" is refused, not read as 1250.
 */
export function parseDepositDollars(text: string): DollarsResult {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: true, cents: 0 };
  const value = trimmed.replace(/^\$\s*/, '');

  const match = PLAIN_DOLLARS.exec(value) ?? GROUPED_DOLLARS.exec(value);
  if (!match || (match[1] === undefined && !match[2])) {
    return { ok: false, error: 'Enter an amount like 50 or 49.50.' };
  }

  const dollars = Number((match[1] ?? '0').replace(/,/g, ''));
  const cents = dollars * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (cents !== 0 && cents < MIN_DEPOSIT_CENTS) {
    return { ok: false, error: 'A deposit must be at least 50 cents, or 0 for none.' };
  }
  if (cents > MAX_DEPOSIT_CENTS) {
    return { ok: false, error: 'A deposit can be at most 10,000 dollars.' };
  }
  return { ok: true, cents };
}

/** Cents to an editable dollar string: 5000 → "50", 4950 → "49.50", 0 → "". */
export function centsToDollarInput(cents: number): string {
  if (cents <= 0) return '';
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(whole) : `${whole}.${String(rest).padStart(2, '0')}`;
}

/** The text to show in a bubble; null hides it (a photo-only message). */
export function visibleMessageBody(body: string, media?: readonly unknown[] | null): string | null {
  return body === PHOTO_ONLY_BODY && (media?.length ?? 0) > 0 ? null : body;
}

const STATUS_LABELS: Record<TattooIntakeStatus, string> = {
  collecting: 'Collecting details',
  ready: 'Ready',
  booked: 'Booked',
  declined: 'Declined',
  needs_review: 'Needs review',
};

export function intakeStatusLabel(status: TattooIntakeStatus): string {
  return STATUS_LABELS[status] ?? humanize(status);
}

const DEPOSIT_LABELS: Record<TattooDepositStatus, string> = {
  pending: 'Waiting for payment',
  paid: 'Paid',
  expired: 'Expired',
  not_sent: 'Not sent',
};

export function depositStatusLabel(status: TattooDepositStatus | null): string {
  return status ? (DEPOSIT_LABELS[status] ?? humanize(status)) : 'No deposit yet';
}

const REVIEW_REASONS: Record<TattooReviewReason, string> = {
  photo_discarded: "A photo couldn't be kept. Follow up with this client.",
  under_18: "This client said they're under 18.",
};

/** Plain wording for a request in review. The reason can be missing. */
export function reviewReasonText(reason: TattooReviewReason | null): string {
  return (reason && REVIEW_REASONS[reason]) ?? 'This request needs a look from the shop.';
}

/** A style id to its label from settings, or readable text if it's unknown. */
export function styleLabel(id: string, styles: readonly TattooStyle[] | undefined): string {
  return styles?.find((s) => s.id === id)?.label ?? humanize(id);
}

/** Decoded size of a base64 string, without decoding it. */
export function base64ByteLength(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Most photos one artist can have picked for the public booking page. */
export const MAX_BOOKING_PAGE_PHOTOS = 9;

/** The booking page's hidden-artist list after showing or hiding one artist. */
export function withArtistOnBookingPage(hiddenStaffIds: readonly string[], staffId: string, shown: boolean): string[] {
  const rest = hiddenStaffIds.filter((id) => id !== staffId);
  return shown ? rest : [...rest, staffId];
}

/** Newest first. Records with no date go last. */
export function newestFirst<T extends { createdAt: string | null }>(items: readonly T[]): T[] {
  const time = (item: T) => (item.createdAt ? new Date(item.createdAt).getTime() : 0);
  return [...items].sort((a, b) => time(b) - time(a));
}

function humanize(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
