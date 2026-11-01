/**
 * Tattoo intake models — the shapes in docs/tattoo-api.md (ToolBelt-final).
 * Photo and portfolio `url`s are signed links that last 15 minutes: they belong
 * in a live query only, never in storage.
 */

export type TattooIntakeStatus = 'collecting' | 'ready' | 'booked' | 'declined' | 'needs_review';
export type TattooReviewReason = 'photo_discarded' | 'under_18';
export type TattooDepositStatus = 'pending' | 'paid' | 'expired' | 'not_sent';
export type TattooTagsSource = 'ai' | 'owner' | 'none';

export interface TattooStyle {
  id: string;
  label: string;
}

export interface TattooSettings {
  available: boolean;
  enabled: boolean;
  depositCents: number;
  consultationServiceId: string | null;
  styles: TattooStyle[];
}

/** PUT /tattoo/settings answers without `styles`. */
export type TattooSettingsUpdateResult = Omit<TattooSettings, 'styles'>;

export interface TattooSettingsUpdate {
  enabled?: boolean;
  depositCents?: number;
}

export interface TattooPhotoAnalysis {
  styles: { name: string; confidence: number }[] | null;
  subject: string | null;
  colorMode: string | null;
  isCoverUp: boolean | null;
  detailLevel: string | null;
  artistNote: string | null;
}

export interface TattooIntakePhoto {
  id: string;
  contentType: string | null;
  /** Always null in the list; a signed link in the detail. */
  url: string | null;
  /** Null when the photo was saved but not read. */
  analysis: TattooPhotoAnalysis | null;
}

export interface TattooIntake {
  id: string;
  conversationId: string;
  status: TattooIntakeStatus;
  reviewReason: TattooReviewReason | null;
  customerName: string | null;
  /** Owners only. */
  customerPhone: string | null;
  photos: TattooIntakePhoto[];
  placement: string | null;
  size: string | null;
  colorMode: string | null;
  budget: string | null;
  timeframe: string | null;
  notes: string | null;
  suggestedStaffId: string | null;
  appointmentId: string | null;
  depositStatus: TattooDepositStatus | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TattooIntakeUpdate {
  status?: 'declined' | 'collecting';
  suggestedStaffId?: string;
}

export interface TattooPortfolioItem {
  id: string;
  staffId: string;
  url: string | null;
  contentType: string | null;
  styleTags: string[];
  tagsSource: TattooTagsSource;
  caption: string;
  createdAt: string | null;
}

export interface TattooPortfolioUpdate {
  styleTags?: string[];
  caption?: string;
}
