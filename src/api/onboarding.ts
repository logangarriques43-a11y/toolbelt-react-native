/**
 * Signup / activation reporting for the owner funnel (backend
 * `POST /onboarding/save`). The backend records the first report per business
 * (alert email to the team, daily funnel counters), so repeats are harmless.
 */

import { api } from '@/lib/api-client';

export interface SignupSource {
  platform: 'web' | 'ios' | 'android';
  /** `?ref=` from the shared link (who sent them). */
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** First page they landed on in the web app. */
  landingPath?: string;
}

/** Right after an owner creates their account. */
export async function reportSignup(signupSource: SignupSource, businessName: string): Promise<void> {
  await api.post('/onboarding/save', { signupSource, businessName });
}

/** The owner can take payments (Stripe payouts approved): the funnel's "set up" step. */
export async function reportOnboardingComplete(): Promise<void> {
  await api.post('/onboarding/save', { onboardingComplete: true });
}
